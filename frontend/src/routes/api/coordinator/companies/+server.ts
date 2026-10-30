import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { getCompanies, createCompany } from '$lib/server/services/coordinator';

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

	try {
		const companies = await getCompanies();
		return json({ success: true, companies });
	} catch (err: any) {
		console.error('Error fetching companies:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	if (user.role !== 'PLACEMENT_COORDINATOR') {
		return json({ error: 'Forbidden', message: 'Only coordinators can register companies' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const company = await createCompany(body);
		return json({ success: true, company }, { status: 201 });
	} catch (err: any) {
		console.error('Error creating company:', err);
		return json({ error: 'Bad Request', message: err.message }, { status: 400 });
	}
};
