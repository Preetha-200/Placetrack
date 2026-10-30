import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { startAssessmentAttempt } from '$lib/server/services/assessments';

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
		return json({ error: 'Unauthorized', message: 'Please log in to start assessment' }, { status: 401 });
	}

	if (user.role !== 'STUDENT') {
		return json({ error: 'Forbidden', message: 'Only students can take assessments' }, { status: 403 });
	}

	try {
		const attemptData = await startAssessmentAttempt(params.id, user.id);
		return json({ success: true, attempt: attemptData });
	} catch (err: any) {
		console.error('Error starting assessment:', err);
		return json({ error: 'Bad Request', message: err.message }, { status: 400 });
	}
};
