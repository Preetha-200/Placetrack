import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { applyToDrive } from '$lib/server/services/coordinator';

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
		return json({ error: 'Unauthorized', message: 'Please login to apply' }, { status: 401 });
	}

	if (user.role !== 'STUDENT') {
		return json({ error: 'Forbidden', message: 'Only students can apply to placement drives' }, { status: 403 });
	}

	try {
		const application = await applyToDrive(user.id, params.id);
		return json({ success: true, application }, { status: 201 });
	} catch (err: any) {
		console.error('Error applying to drive:', err);
		return json({ error: 'Application Error', message: err.message }, { status: 400 });
	}
};
