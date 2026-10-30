import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { evaluateCodeAgainstTestCases } from '$lib/server/services/codeExecution';
import { CODING_PROBLEMS } from '$lib/server/services/codingProblemsData';
import { collections } from '$lib/server/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';
import { getSql, isUuid } from '$lib/server/db';
import { checkRateLimit } from '$lib/server/utils/rateLimit';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	let user = locals.user;
	if (!user) {
		const authHeader = request.headers.get('authorization');
		const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
		if (token) {
			user = await validateSessionToken(token);
		}
	}

	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required to submit solution' }, { status: 401 });
	}

	// Rate limiting: 10 code submissions per minute per user
	const rateLimitCheck = checkRateLimit(`code_submit:${user.id}`, 10, 60000);
	if (!rateLimitCheck.allowed) {
		return json(
			{
				error: 'RateLimitExceeded',
				message: `Code submission limit reached. Please wait ${rateLimitCheck.retryAfterSeconds} seconds before submitting again.`
			},
			{ status: 429 }
		);
	}

	try {
		const body = await request.json();
		const { problemId, language, code } = body;

		if (!problemId || !code || typeof code !== 'string') {
			return json({ error: 'Validation Error', message: 'Problem ID and code are required' }, { status: 400 });
		}

		if (code.length > 50000) {
			return json({ error: 'Validation Error', message: 'Code exceeds maximum size limit (50KB)' }, { status: 400 });
		}

		if (!['python', 'java', 'c', 'cpp'].includes(language)) {
			return json({ error: 'Validation Error', message: 'Supported languages: python, java, c, cpp' }, { status: 400 });
		}

		const problem = CODING_PROBLEMS.find((p) => p.id === problemId);
		if (!problem) {
			return json({ error: 'Not Found', message: 'Coding problem not found' }, { status: 404 });
		}

		// Evaluate against all problem test cases
		const evaluation = await evaluateCodeAgainstTestCases(
			language,
			code,
			problem.testCases,
			problem.timeLimitMs
		);

		const now = Timestamp.now();
		const submissionDoc = {
			studentId: user.id,
			studentName: user.name,
			studentReg: user.registerNumber || 'Student',
			problemId: problem.id,
			problemTitle: problem.title,
			topic: problem.topic,
			difficulty: problem.difficulty,
			language,
			code,
			status: evaluation.status,
			passedTests: evaluation.passedTests,
			totalTests: evaluation.totalTests,
			executionTimeMs: evaluation.executionTimeMs,
			memoryKb: evaluation.memoryKb,
			testCaseResults: evaluation.testCaseResults.map((r) => ({
				testCaseIndex: r.testCaseIndex,
				passed: r.passed,
				input: r.isHidden ? 'Hidden testcase' : r.input,
				expectedOutput: r.isHidden ? 'Hidden output' : r.expectedOutput,
				actualOutput: r.isHidden ? (r.passed ? 'Matches expected' : 'Output mismatch') : r.actualOutput,
				executionTimeMs: r.executionTimeMs,
				error: r.error,
				isHidden: r.isHidden
			})),
			submittedAt: now,
			createdAt: now
		};

		// 1. Save in Firestore `codeSubmissions`
		let savedDocId = '';
		try {
			const docRef = await collections.codeSubmissions().doc();
			await docRef.set(submissionDoc);
			savedDocId = docRef.id;
		} catch (e) {
			console.warn('Could not save to Firestore codeSubmissions:', e);
		}

		// 2. Also save in PostgreSQL if available
		const sql = getSql();
		if (sql && isUuid(user.id)) {
			try {
				await sql`
					CREATE TABLE IF NOT EXISTS code_submissions (
						id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
						student_id UUID NOT NULL,
						problem_id VARCHAR(100) NOT NULL,
						problem_title VARCHAR(255) NOT NULL,
						topic VARCHAR(100) NOT NULL,
						difficulty VARCHAR(50) NOT NULL,
						language VARCHAR(50) NOT NULL,
						code TEXT NOT NULL,
						status VARCHAR(50) NOT NULL,
						passed_tests INT NOT NULL,
						total_tests INT NOT NULL,
						execution_time_ms INT NOT NULL DEFAULT 0,
						test_case_results JSONB DEFAULT '[]'::jsonb,
						submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
					);
				`;

				const dbRes = await sql`
					INSERT INTO code_submissions (
						student_id,
						problem_id,
						problem_title,
						topic,
						difficulty,
						language,
						code,
						status,
						passed_tests,
						total_tests,
						execution_time_ms,
						test_case_results
					) VALUES (
						${user.id},
						${problem.id},
						${problem.title},
						${problem.topic},
						${problem.difficulty},
						${language},
						${code},
						${evaluation.status},
						${evaluation.passedTests},
						${evaluation.totalTests},
						${evaluation.executionTimeMs},
						${JSON.stringify(submissionDoc.testCaseResults)}::jsonb
					)
					RETURNING id
				`;
				if (dbRes.length > 0 && !savedDocId) {
					savedDocId = dbRes[0].id;
				}
			} catch (dbErr) {
				console.warn('Could not persist code submission to PostgreSQL:', dbErr);
			}
		}

		const safeEvaluation = {
			...evaluation,
			testCaseResults: submissionDoc.testCaseResults
		};

		return json({
			success: true,
			submissionId: savedDocId,
			evaluation: safeEvaluation,
			testCaseResults: submissionDoc.testCaseResults
		});
	} catch (err: any) {
		console.error('Error in /api/code/submit:', err);
		return json({ error: 'Submission Error', message: err.message || 'Failed to evaluate code submission' }, { status: 500 });
	}
};
