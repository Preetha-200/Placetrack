import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AUTH_COOKIE_NAME } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, request }) => {
	// 1. Clear session cookie
	cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
	cookies.set(AUTH_COOKIE_NAME, '', {
		path: '/',
		maxAge: 0,
		expires: new Date(0),
		httpOnly: true,
		sameSite: 'lax'
	});

	// 2. If regular form submission (non-fetch HTML navigation), redirect immediately to login
	const accept = request.headers.get('accept') || '';
	if (accept.includes('text/html')) {
		throw redirect(303, '/login');
	}

	// 3. Return JSON response for client-side fetch calls
	return json({
		message: 'Logged out successfully',
		success: true,
		redirectTo: '/login'
	});
};
