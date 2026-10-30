import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { setDriveStatus } from '$lib/server/services/coordinator';

async function getAuthenticatedUser(locals: App.Locals, request: Request, cookies: any) {
	if (locals.user) return locals.user;
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
	if (token) return await validateSessionToken(token);
	return null;
}

export const POST: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (user.role !== 'PLACEMENT_COORDINATOR') {
		return json({ error: 'Forbidden', message: 'Only coordinators can close drives' }, { status: 403 });
	}

	try {
		const result = await setDriveStatus(params.id, 'Completed');
		return json(result);
	} catch (err: any) {
		console.error('Error closing drive:', err);
		return json({ error: 'Bad Request', message: err.message }, { status: 400 });
	}
};
