import { json, type RequestHandler } from '@sveltejs/kit';
import { collections } from '$lib/server/firebase/collections';
import { getSql, isUuid } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	try {
		// 1. Primary: Cloud Firestore
		const snapshot = await collections
			.aiQuizAttempts()
			.where('studentId', '==', user.id)
			.limit(20)
			.get();

		if (!snapshot.empty) {
			const attempts = snapshot.docs.map((doc) => {
				const data = doc.data();
				return {
					id: doc.id,
					quizId: data.quizId,
					topic: data.topic,
					language: data.language,
					difficulty: data.difficulty,
					score: data.score,
					totalQuestions: data.totalQuestions,
					percentage: data.percentage,
					timeSpentSeconds: data.timeSpentSeconds,
					createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString()
				};
			});

			return json({ attempts });
		}

		// 2. Fallback: PostgreSQL
		const sql = getSql();
		if (sql && isUuid(user.id)) {
			try {
				const rows = await sql`
					SELECT 
						id,
						quiz_id as "quizId",
						topic,
						language,
						difficulty,
						score,
						total_questions as "totalQuestions",
						percentage,
						time_spent_seconds as "timeSpentSeconds",
						created_at as "createdAt"
					FROM ai_quiz_attempts
					WHERE student_id = ${user.id}
					ORDER BY created_at DESC
					LIMIT 20;
				`;
				if (rows && rows.length > 0) {
					return json({ attempts: rows });
				}
			} catch (sqlErr) {
				console.warn('PostgreSQL ai_quiz_attempts query notice:', sqlErr);
			}
		}

		return json({ attempts: [] });
	} catch (err: any) {
		console.error('Error fetching quiz attempts:', err);
		return json({ error: 'FetchError', message: err.message || 'Failed to fetch quiz attempts' }, { status: 500 });
	}
};
