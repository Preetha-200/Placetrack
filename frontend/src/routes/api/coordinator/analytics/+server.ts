import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { getCoordinatorAnalytics } from '$lib/server/services/analytics';

async function getAuthenticatedUser(locals: App.Locals, request: Request, cookies: any) {
	if (locals.user) return locals.user;
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
	if (token) return await validateSessionToken(token);
	return null;
}

export const GET: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	if (user.role !== 'PLACEMENT_COORDINATOR') {
		return json(
			{ error: 'Forbidden', message: 'Only placement coordinators can access analytics' },
			{ status: 403 }
		);
	}

	try {
		const analytics = await getCoordinatorAnalytics();
		return json({ success: true, analytics });
	} catch (err: any) {
		console.error('Error fetching coordinator analytics:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};
