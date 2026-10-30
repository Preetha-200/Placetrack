import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';

export const GET: RequestHandler = async ({ locals, request, cookies }) => {
	// 1. Check if already populated by hooks from session cookie
	let user = locals.user;

	// 2. If not populated, check Authorization: Bearer <token> or direct cookie
	if (!user) {
		const authHeader = request.headers.get('authorization');
		let token: string | undefined;

		if (authHeader && authHeader.startsWith('Bearer ')) {
			token = authHeader.substring(7).trim();
		} else {
			token = cookies.get(AUTH_COOKIE_NAME);
		}

		if (token) {
			user = await validateSessionToken(token);
		}
	}

	// 3. If unauthenticated, return 401 Unauthorized
	if (!user) {
		return json(
			{
				error: 'Unauthorized',
				message: 'Authentication is required to access this resource.'
			},
			{ status: 401 }
		);
	}

	// 4. Return user profile information without sensitive data
	return json({
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role
	});
};
