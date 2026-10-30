import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { getTrainerAssessmentAttempts } from '$lib/server/services/assessments';

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

	if (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const isCoordinator = user.role === 'PLACEMENT_COORDINATOR';
		const data = await getTrainerAssessmentAttempts(params.id, user.id, isCoordinator);
		return json(data);
	} catch (err: any) {
		console.error('Error fetching assessment attempts:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};
