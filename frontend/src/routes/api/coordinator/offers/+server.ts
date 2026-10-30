import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { getPlacementOffers, createPlacementOffer } from '$lib/server/services/coordinator';

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
		return json({ error: 'Forbidden', message: 'Only coordinators can access placement offers' }, { status: 403 });
	}

	try {
		const offers = await getPlacementOffers();
		return json({ success: true, offers });
	} catch (err: any) {
		console.error('Error fetching placement offers:', err);
		return json({ error: 'Server Error', message: 'Failed to fetch placement offers' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	if (user.role !== 'PLACEMENT_COORDINATOR') {
		return json({ error: 'Forbidden', message: 'Only coordinators can record placement offers' }, { status: 403 });
	}

	try {
		const body = await request.json();
		if (!body.companyName || typeof body.companyName !== 'string') {
			return json({ error: 'Validation Error', message: 'Company name is required' }, { status: 400 });
		}
		if (!body.studentId && !body.studentName) {
			return json({ error: 'Validation Error', message: 'Student identification is required' }, { status: 400 });
		}

		const offer = await createPlacementOffer(body);
		return json({ success: true, offer }, { status: 201 });
	} catch (err: any) {
		console.error('Error creating placement offer:', err);
		return json({ error: 'Bad Request', message: err.message || 'Failed to create placement offer' }, { status: 400 });
	}
};
