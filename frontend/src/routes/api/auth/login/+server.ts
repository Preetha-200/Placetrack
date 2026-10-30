import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import {
	findUserByIdentifier,
	verifyUserPassword,
	createSessionToken,
	getDashboardUrl,
	toSafeUser,
	AUTH_COOKIE_NAME,
	AuthBackendError
} from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/utils/rateLimit';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	const clientIp = (() => {
		try {
			return getClientAddress();
		} catch {
			return '127.0.0.1';
		}
	})();

	// Rate limiting: 10 attempts per minute per IP
	const rateLimitCheck = checkRateLimit(`login:${clientIp}`, 10, 60000);
	if (!rateLimitCheck.allowed) {
		return json(
			{
				error: 'Too many login attempts. Please wait a moment before trying again.',
				retryAfterSeconds: rateLimitCheck.retryAfterSeconds
			},
			{ status: 429 }
		);
	}

	try {
		const body = await request.json();
		const { email, username, identifier, registerNumber, password, rememberMe, role } = body;
		const userKey = (registerNumber || identifier || username || email || '').trim();

		if (!userKey || !password || typeof password !== 'string' || userKey.length > 100 || password.length > 128) {
			return json(
				{
					error:
						role === 'student'
							? 'Please enter your Register Number (as both username & password).'
							: 'Please enter both your username/email and password.'
				},
				{ status: 400 }
			);
		}

		let user;
		try {
			user = await findUserByIdentifier(userKey, role);
		} catch (err) {
			if (err instanceof AuthBackendError) {
				const errorMsg = dev
					? 'Database not reachable. Please verify Firebase Firestore or database connection.'
					: 'Database is currently unavailable. Please contact the administrator or try again later.';
				return json({ error: errorMsg }, { status: 503 });
			}
			throw err;
		}

		if (!user) {
			return json(
				{
					error:
						role === 'student'
							? 'Student record not found. Please enter a valid Register Number (e.g. 2024MCA1042).'
							: 'Invalid username/email or password.'
				},
				{ status: 401 }
			);
		}

		if (user.isActive === false) {
			return json(
				{ error: 'Your account is inactive. Please contact the administrator.' },
				{ status: 403 }
			);
		}

		const isValid = verifyUserPassword(user, password, userKey);
		if (!isValid) {
			return json(
				{
					error:
						user.role === 'STUDENT'
							? 'Authentication failed. Sona Learn standard: Enter your Register Number as both username and password (e.g. 2024MCA1042).'
							: 'Invalid username/email or password.'
				},
				{ status: 401 }
			);
		}

		// Create session token
		const token = createSessionToken(user);

		// Session cookie configuration:
		// If rememberMe is false, omitting maxAge creates a browser SESSION cookie
		// which expires as soon as the browser tab/window is closed.
		const cookieOptions: {
			path: string;
			httpOnly: boolean;
			sameSite: 'lax' | 'strict' | 'none';
			secure: boolean;
			maxAge?: number;
		} = {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev
		};

		if (rememberMe) {
			cookieOptions.maxAge = 60 * 60 * 24 * 7; // 7 days
		}

		cookies.set(AUTH_COOKIE_NAME, token, cookieOptions);

		const redirectTo = getDashboardUrl(user.role);

		return json({
			message: 'Login successful',
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				registerNumber: user.registerNumber
			},
			redirectTo,
			success: true
		});
	} catch (err) {
		console.error('Login error:', err);
		if (err instanceof AuthBackendError) {
				const errorMsg = dev
					? 'Database not reachable. Please verify Firebase Firestore or database connection.'
					: 'Database is currently unavailable. Please contact the administrator or try again later.';
			return json({ error: errorMsg }, { status: 503 });
		}
		return json(
			{ error: 'An unexpected authentication error occurred. Please try again.' },
			{ status: 500 }
		);
	}
};
