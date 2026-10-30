import { redirect, type Handle } from '@sveltejs/kit';
import { AUTH_COOKIE_NAME, validateSessionToken, getDashboardUrl } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Extract session token from cookie OR Authorization header (Bearer token)
	const authHeader = event.request.headers.get('authorization');
	let token: string | undefined;

	if (authHeader && authHeader.startsWith('Bearer ')) {
		token = authHeader.substring(7).trim();
	} else {
		token = event.cookies.get(AUTH_COOKIE_NAME);
	}

	if (token) {
		const user = await validateSessionToken(token);
		event.locals.user = user;
	} else {
		event.locals.user = null;
	}

	const { pathname } = event.url;
	const user = event.locals.user;

	// 2. Server-side Route Protection for UI Dashboards
	if (pathname.startsWith('/student')) {
		if (!user) {
			throw redirect(303, '/login?role=student');
		}
		if (user.role !== 'STUDENT') {
			throw redirect(303, getDashboardUrl(user.role));
		}
	} else if (pathname.startsWith('/trainer')) {
		if (!user) {
			throw redirect(303, '/login?role=trainer');
		}
		if (user.role !== 'TRAINER') {
			throw redirect(303, getDashboardUrl(user.role));
		}
	} else if (pathname.startsWith('/coordinator')) {
		if (!user) {
			throw redirect(303, '/login?role=coordinator');
		}
		if (user.role !== 'PLACEMENT_COORDINATOR') {
			throw redirect(303, getDashboardUrl(user.role));
		}
	}

	// 3. API Endpoint Authentication & Role-Based Authorization
	if (pathname.startsWith('/api/')) {
		const isPublicApi =
			pathname === '/api/health' ||
			pathname === '/api/auth/login' ||
			pathname === '/api/auth/logout';

		if (!isPublicApi) {
			if (!user) {
				return new Response(
					JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
					{
						status: 401,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}

			// Coordinator API namespace
			if (pathname.startsWith('/api/coordinator/')) {
				const isDriveListing = pathname === '/api/coordinator/drives';
				const isDriveApply = pathname.startsWith('/api/coordinator/drives/') && pathname.endsWith('/apply');
				const isDriveApps = pathname.startsWith('/api/coordinator/drives/') && pathname.endsWith('/applications');

				if (isDriveApply) {
					if (user.role !== 'STUDENT') {
						return new Response(
							JSON.stringify({ error: 'Forbidden', message: 'Only students can apply to placement drives' }),
							{ status: 403, headers: { 'Content-Type': 'application/json' } }
						);
					}
				} else if (isDriveApps) {
					if (user.role !== 'PLACEMENT_COORDINATOR' && user.role !== 'TRAINER') {
						return new Response(
							JSON.stringify({ error: 'Forbidden', message: 'Only coordinators and trainers can view drive applications' }),
							{ status: 403, headers: { 'Content-Type': 'application/json' } }
						);
					}
				} else if (isDriveListing && event.request.method === 'GET') {
					if (user.role !== 'PLACEMENT_COORDINATOR' && user.role !== 'STUDENT' && user.role !== 'TRAINER') {
						return new Response(
							JSON.stringify({ error: 'Forbidden', message: 'Access denied' }),
							{ status: 403, headers: { 'Content-Type': 'application/json' } }
						);
					}
				} else if (user.role !== 'PLACEMENT_COORDINATOR') {
					return new Response(
						JSON.stringify({ error: 'Forbidden', message: 'Placement coordinator privileges required' }),
						{ status: 403, headers: { 'Content-Type': 'application/json' } }
					);
				}
			}

			// Trainer API namespace
			if (pathname.startsWith('/api/trainer/')) {
				if (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR') {
					return new Response(
						JSON.stringify({ error: 'Forbidden', message: 'Trainer privileges required' }),
						{ status: 403, headers: { 'Content-Type': 'application/json' } }
					);
				}
			}

			// Student API namespace
			if (pathname.startsWith('/api/student/')) {
				if (user.role !== 'STUDENT') {
					return new Response(
						JSON.stringify({ error: 'Forbidden', message: 'Student role required' }),
						{ status: 403, headers: { 'Content-Type': 'application/json' } }
					);
				}
			}
		}
	}

	const response = await resolve(event);

	// 4. Defense-in-depth Security Headers
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};

export const handleError = ({ error, event }: any) => {
	console.error('SERVER HOOK CAUGHT ERROR:', event.url.pathname, error);
	return {
		message: error?.message || 'Internal Server Error'
	};
};
