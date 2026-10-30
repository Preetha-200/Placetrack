import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { submitAssessmentAttempt } from '$lib/server/services/assessments';

export const POST: RequestHandler = async ({ params, locals, request, cookies }) => {
	let user = locals.user;
	if (!user) {
		const authHeader = request.headers.get('authorization');
		const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
		if (token) {
			user = await validateSessionToken(token);
		}
	}

	if (!user) {
		return json({ error: 'Unauthorized', message: 'Please log in to submit assessment' }, { status: 401 });
	}

	if (user.role !== 'STUDENT') {
		return json({ error: 'Forbidden', message: 'Only students can submit assessments' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { attemptId, answers, timeSpentSeconds } = body;

		if (!attemptId) {
			return json({ error: 'Validation Error', message: 'Attempt ID is required' }, { status: 400 });
		}

		const result = await submitAssessmentAttempt(
			params.id,
			attemptId,
			user.id,
			answers || {},
			Number(timeSpentSeconds) || 0
		);

		return json({ success: true, result });
	} catch (err: any) {
		console.error('Error submitting assessment:', err);
		return json({ error: 'Submission Error', message: err.message }, { status: 400 });
	}
};
