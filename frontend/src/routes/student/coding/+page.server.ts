import type { PageServerLoad } from './$types';
import { collections } from '$lib/server/firebase/collections';
import { getSql, isUuid } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	const problemId = url.searchParams.get('problem') || 'prob-arr-04';

	let submissions: any[] = [];

	if (user) {
		// 1. Primary Source of Truth: Cloud Firestore
		try {
			const snap = await collections.codeSubmissions().where('studentId', '==', user.id).get();
			submissions = snap.docs.map((d: any) => {
				const data = d.data();
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
					submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate().toISOString() : new Date().toISOString()
				};
			});
			submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
		} catch (e) {
			console.warn('Could not load code submissions from Firestore:', e);
		}

		// 2. Secondary Fallback: PostgreSQL
		if (submissions.length === 0) {
			const sql = getSql();
			if (sql && isUuid(user.id)) {
				try {
					const rows = await sql`
						SELECT * FROM code_submissions
						WHERE student_id = ${user.id}
						ORDER BY submitted_at DESC
						LIMIT 30
					`;
					submissions = rows.map((r: any) => ({
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
						submittedAt: r.submitted_at instanceof Date ? r.submitted_at.toISOString() : r.submitted_at
					}));
				} catch (e) {
					console.warn('Could not load code submissions from PostgreSQL fallback:', e);
				}
			}
		}
	}

	return {
		initialProblemId: problemId,
		userSubmissions: submissions
	};
};
