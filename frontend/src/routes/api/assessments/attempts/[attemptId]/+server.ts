import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { getAttemptBreakdown } from '$lib/server/services/assessments';

export const GET: RequestHandler = async ({ params, locals, request, cookies }) => {
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

	try {
		const data = await getAttemptBreakdown(params.attemptId, user);
		return json(data);
	} catch (err: any) {
		console.error('Error fetching attempt breakdown:', err);
		return json({ error: 'Forbidden', message: err.message }, { status: 403 });
	}
};
