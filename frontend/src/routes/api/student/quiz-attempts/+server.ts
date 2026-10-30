import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { collections } from '$lib/server/firebase/collections';
import { getSql, isUuid } from '$lib/server/db';
import { Timestamp } from 'firebase-admin/firestore';
import { QUESTION_BANK } from '$lib/student/quizData';
import crypto from 'node:crypto';

// Lookup map for fast and secure server-side re-scoring
const QUESTION_MAP = new Map<string, { topic: string; correctIndex: number; category: string }>();
for (const q of QUESTION_BANK) {
	QUESTION_MAP.set(q.id, { topic: q.topic, correctIndex: q.correctIndex, category: q.category });
}

async function getAuthenticatedUser(locals: App.Locals, request: Request, cookies: any) {
	if (locals.user) return locals.user;
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
	if (token) {
		return await validateSessionToken(token);
	}
	return null;
}

export const GET: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user || user.role !== 'STUDENT') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// 1. Primary: Cloud Firestore
	try {
		const snap = await collections
			.quizAttempts()
			.where('studentId', '==', user.id)
			.get();

		if (!snap.empty) {
			const attempts = snap.docs.map((doc) => {
				const q = doc.data();
				const createdAt = q.createdAt?.toDate ? q.createdAt.toDate() : new Date();
				return {
					id: doc.id,
					studentId: q.studentId,
					category: q.category,
					levelBefore: q.levelBefore || 'Intermediate',
					levelAfter: q.levelAfter || 'Intermediate',
					score: q.score,
					totalQuestions: q.totalQuestions,
					percentage: q.percentage,
					timeSpentSeconds: q.timeSpentSeconds,
					answers: q.answers || [],
					createdAt
				};
			});

			attempts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			return json({ success: true, attempts });
		}
	} catch (err) {
		console.warn('Firestore quiz-attempts read notice:', err);
	}

	// 2. Fallback: PostgreSQL
	const sql = getSql();
	if (!sql || !isUuid(user.id)) {
		return json({ success: true, attempts: [] });
	}

	try {
		let studentId = user.id;
		const sRows = await sql`SELECT id FROM students WHERE id = ${user.id} OR user_id = ${user.id} LIMIT 1`;
		if (sRows.length > 0) studentId = sRows[0].id;

		const rows = await sql`
			SELECT 
				id,
				student_id AS "studentId",
				category,
				level_before AS "levelBefore",
				level_after AS "levelAfter",
				score,
				total_questions AS "totalQuestions",
				percentage,
				time_spent_seconds AS "timeSpentSeconds",
				answers,
				created_at AS "createdAt"
			FROM quiz_attempts
			WHERE student_id = ${studentId}
			ORDER BY created_at DESC
		`;

		const attempts = rows.map((q: any) => ({
			id: q.id,
			studentId: q.studentId,
			category: q.category,
			levelBefore: q.levelBefore,
			levelAfter: q.levelAfter,
			score: q.score,
			totalQuestions: q.totalQuestions,
			percentage: Number(q.percentage),
			timeSpentSeconds: q.timeSpentSeconds,
			answers: q.answers,
			createdAt: q.createdAt instanceof Date ? q.createdAt : new Date(q.createdAt)
		}));

		return json({ success: true, attempts });
	} catch (err: any) {
		console.warn('PostgreSQL quiz attempts lookup notice:', err);
		return json({ success: true, attempts: [] });
	}
};

export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user || user.role !== 'STUDENT') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { category, levelBefore, levelAfter, timeSpentSeconds, answers } = body;

	if (!category || !Array.isArray(answers) || answers.length === 0) {
		return json({ error: 'category and non-empty answers array are required' }, { status: 400 });
	}

	// SERVER-SIDE RE-SCORING
	let score = 0;
	const totalQuestions = answers.length;
	const scoredAnswers: Array<{ questionId: string; selectedOption: number; isCorrect: boolean }> = [];

	for (const ans of answers) {
		const questionId = String(ans.questionId || '');
		const selectedOption = Number(ans.selectedOption);
		const qMeta = QUESTION_MAP.get(questionId);

		let isCorrect = false;
		if (qMeta && selectedOption === qMeta.correctIndex) {
			isCorrect = true;
			score++;
		}

		scoredAnswers.push({
			questionId,
			selectedOption,
			isCorrect
		});
	}

	const percentage = totalQuestions > 0 ? Number(((score / totalQuestions) * 100).toFixed(2)) : 0;
	const attemptId = crypto.randomUUID();
	const now = Timestamp.now();

	const attemptData = {
		id: attemptId,
		studentId: user.id,
		category,
		levelBefore: levelBefore || 'Intermediate',
		levelAfter: levelAfter || 'Intermediate',
		score,
		totalQuestions,
		percentage,
		timeSpentSeconds: Number(timeSpentSeconds) || 0,
		answers: scoredAnswers,
		createdAt: now
	};

	// 1. Primary: Cloud Firestore
	try {
		await collections.quizAttempts().doc(attemptId).set(attemptData);

		// Update student category score in Firestore
		try {
			const sRef = collections.students().doc(user.id);
			const sDoc = await sRef.get();
			if (sDoc.exists) {
				const s = sDoc.data()!;
				const catLower = (category || '').toLowerCase();
				let apt = Number(s.aptitudeScore) || 80;
				let vrb = Number(s.verbalScore) || 85;
				let log = Number(s.logicalScore) || 78;

				if (catLower.includes('aptitude') || catLower.includes('quant')) {
					apt = Math.min(100, Math.max(10, Math.round(apt * 0.8 + percentage * 0.2)));
				} else if (catLower.includes('verbal') || catLower.includes('eng')) {
					vrb = Math.min(100, Math.max(10, Math.round(vrb * 0.8 + percentage * 0.2)));
				} else if (catLower.includes('logical') || catLower.includes('reason')) {
					log = Math.min(100, Math.max(10, Math.round(log * 0.8 + percentage * 0.2)));
				}

				const readinessScore = Math.round((apt + vrb + log) / 3);
				const readinessStatus =
					readinessScore >= 75 ? 'Placement Ready' : readinessScore >= 60 ? 'In Training' : 'Needs Assessment';

				await sRef.set(
					{
						aptitudeScore: apt,
						verbalScore: vrb,
						logicalScore: log,
						readinessScore,
						readinessStatus,
						testsCompleted: (s.testsCompleted || 0) + 1,
						updatedAt: now
					},
					{ merge: true }
				);
			}
		} catch (sErr) {
			console.warn('Student score update notice in Firestore:', sErr);
		}
	} catch (fsErr) {
		console.warn('Firestore quiz attempt write notice:', fsErr);
	}

	// 2. Sync: PostgreSQL (if available)
	const sql = getSql();
	if (sql && isUuid(user.id)) {
		try {
			let studentId = user.id;
			const sRows = await sql`SELECT id FROM students WHERE id = ${user.id} OR user_id = ${user.id} LIMIT 1`;
			if (sRows.length > 0) studentId = sRows[0].id;

			await sql`
				INSERT INTO quiz_attempts (
					id,
					student_id,
					category,
					level_before,
					level_after,
					score,
					total_questions,
					percentage,
					time_spent_seconds,
					answers
				) VALUES (
					${attemptId},
					${studentId},
					${category},
					${levelBefore || 'Intermediate'},
					${levelAfter || 'Intermediate'},
					${score},
					${totalQuestions},
					${percentage},
					${Number(timeSpentSeconds) || 0},
					${JSON.stringify(scoredAnswers)}::jsonb
				)
			`;
		} catch (sqlErr) {
			console.warn('PostgreSQL quiz attempt sync notice:', sqlErr);
		}
	}

	return json(
		{
			success: true,
			attempt: {
				id: attemptId,
				studentId: user.id,
				category,
				levelBefore,
				levelAfter,
				score,
				totalQuestions,
				percentage,
				timeSpentSeconds,
				answers: scoredAnswers,
				createdAt: new Date()
			}
		},
		{ status: 201 }
	);
};
