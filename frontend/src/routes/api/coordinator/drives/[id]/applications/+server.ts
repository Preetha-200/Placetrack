import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { getDriveApplications } from '$lib/server/services/coordinator';

async function getAuthenticatedUser(locals: App.Locals, request: Request, cookies: any) {
	if (locals.user) return locals.user;
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
	if (token) return await validateSessionToken(token);
	return null;
}

export const GET: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (user.role !== 'PLACEMENT_COORDINATOR' && user.role !== 'TRAINER') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const applications = await getDriveApplications(params.id);
		return json({ success: true, applications });
	} catch (err: any) {
		console.error('Error fetching drive applications:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};
