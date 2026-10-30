import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import {
	getCompanyById,
	updateCompany,
	setCompanyActiveStatus
} from '$lib/server/services/coordinator';

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

	try {
		const company = await getCompanyById(params.id);
		if (!company) {
			return json({ error: 'Not Found', message: 'Company not found' }, { status: 404 });
		}
		return json({ success: true, company });
	} catch (err: any) {
		console.error('Error fetching company:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (user.role !== 'PLACEMENT_COORDINATOR') {
		return json({ error: 'Forbidden', message: 'Only coordinators can edit companies' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const updated = await updateCompany(params.id, body);
		return json({ success: true, company: updated });
	} catch (err: any) {
		console.error('Error updating company:', err);
		return json({ error: 'Bad Request', message: err.message }, { status: 400 });
	}
};

export const PATCH: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (user.role !== 'PLACEMENT_COORDINATOR') {
		return json({ error: 'Forbidden', message: 'Only coordinators can update company status' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const isActive = body.isActive !== undefined ? Boolean(body.isActive) : false;
		const result = await setCompanyActiveStatus(params.id, isActive);
		return json(result);
	} catch (err: any) {
		console.error('Error modifying company status:', err);
		return json({ error: 'Bad Request', message: err.message }, { status: 400 });
	}
};
