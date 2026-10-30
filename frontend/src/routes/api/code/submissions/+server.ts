import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { collections } from '$lib/server/firebase/collections';
import { getSql, isUuid } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, request, cookies, locals }) => {
	let user = locals.user;
	if (!user) {
		const authHeader = request.headers.get('authorization');
		const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
		if (token) {
			user = await validateSessionToken(token);
		}
	}

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const problemId = url.searchParams.get('problemId');
	const sql = getSql();

	// Security: Students can ONLY query their own submissions. Trainers/Coordinators can view target student.
	let targetStudentId = user.id;
	if (user.role === 'TRAINER' || user.role === 'PLACEMENT_COORDINATOR') {
		const paramStudentId = url.searchParams.get('studentId');
		if (paramStudentId) {
			targetStudentId = paramStudentId;
		}
	}

	// 1. Primary Source of Truth: Cloud Firestore
	try {
		let queryRef: any = collections.codeSubmissions().where('studentId', '==', targetStudentId);
		if (problemId) {
			queryRef = queryRef.where('problemId', '==', problemId);
		}

		const snap = await queryRef.get();
		if (snap.docs.length > 0) {
			const submissions = snap.docs.map((d: any) => {
				const data = d.data();
				const submittedDate = data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date();
				return {
					id: d.id,
					problemId: data.problemId,
					problemTitle: data.problemTitle,
					topic: data.topic,
					difficulty: data.difficulty,
					language: data.language,
					code: data.code,
					status: data.status,
					passedTests: data.passedTests,
					totalTests: data.totalTests,
					executionTimeMs: data.executionTimeMs,
					testCaseResults: data.testCaseResults,
					submittedAt: submittedDate.toISOString()
				};
			});

			submissions.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
			return json({ success: true, submissions });
		}
	} catch (fsErr) {
		console.warn('Firestore code submissions query fallback:', fsErr);
	}

	// 2. Secondary Fallback: PostgreSQL
	if (sql && isUuid(targetStudentId)) {
		try {
			let query;
			if (problemId) {
				query = await sql`
					SELECT * FROM code_submissions
					WHERE student_id = ${targetStudentId} AND problem_id = ${problemId}
					ORDER BY submitted_at DESC
					LIMIT 20
				`;
			} else {
				query = await sql`
					SELECT * FROM code_submissions
					WHERE student_id = ${targetStudentId}
					ORDER BY submitted_at DESC
					LIMIT 50
				`;
			}

			if (query.length > 0) {
				const submissions = query.map((r: any) => ({
					id: r.id,
					problemId: r.problem_id,
					problemTitle: r.problem_title,
					topic: r.topic,
					difficulty: r.difficulty,
					language: r.language,
					code: r.code,
					status: r.status,
					passedTests: r.passed_tests,
					totalTests: r.total_tests,
					executionTimeMs: r.execution_time_ms,
					testCaseResults: r.test_case_results,
					submittedAt: r.submitted_at instanceof Date ? r.submitted_at.toISOString() : r.submitted_at
				}));
				return json({ success: true, submissions });
			}
		} catch (err) {
			console.warn('PostgreSQL code submissions fetch warning:', err);
		}
	}

	return json({ success: true, submissions: [] });
};
