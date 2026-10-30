import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import {
	getAssessmentById,
	updateAssessment,
	deleteAssessment
} from '$lib/server/services/assessments';

async function getAuthenticatedUser(locals: App.Locals, request: Request, cookies: any) {
	if (locals.user) return locals.user;
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
	if (token) {
		return await validateSessionToken(token);
	}
	return null;
}

export const GET: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const assessment = await getAssessmentById(params.id, user);
		if (!assessment) {
			return json({ error: 'Not Found', message: 'Assessment not found' }, { status: 404 });
		}
		return json({ assessment });
	} catch (err: any) {
		console.error('Error fetching assessment:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const isCoordinator = user.role === 'PLACEMENT_COORDINATOR';
		const updated = await updateAssessment(params.id, user.id, body, isCoordinator);
		return json({ success: true, assessment: updated });
	} catch (err: any) {
		console.error('Error updating assessment:', err);
		return json({ error: 'Bad Request', message: err.message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const isCoordinator = user.role === 'PLACEMENT_COORDINATOR';
		await deleteAssessment(params.id, user.id, isCoordinator);
		return json({ success: true, message: 'Assessment deleted successfully' });
	} catch (err: any) {
		console.error('Error deleting assessment:', err);
		return json({ error: 'Bad Request', message: err.message }, { status: 400 });
	}
};
