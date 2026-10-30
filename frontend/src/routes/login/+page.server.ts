import type { PageServerLoad } from './$types';
import { AUTH_COOKIE_NAME } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies, locals }) => {
	// Whenever visiting the login page, clear any existing session cookie
	// so the user must explicitly supply their credentials.
	cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
	cookies.set(AUTH_COOKIE_NAME, '', {
		path: '/',
		maxAge: 0,
		expires: new Date(0),
		httpOnly: true,
		sameSite: 'lax'
	});
	locals.user = null;

	return {};
};
