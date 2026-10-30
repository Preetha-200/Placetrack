import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import {
	createAssessment,
	getTrainerAssessments,
	getStudentAssignedAssessments
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

export const GET: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Please log in to view assessments' }, { status: 401 });
	}

	try {
		if (user.role === 'TRAINER') {
			const assessments = await getTrainerAssessments(user.id, false);
			return json({ assessments });
		} else if (user.role === 'PLACEMENT_COORDINATOR') {
			const assessments = await getTrainerAssessments(user.id, true);
			return json({ assessments });
		} else if (user.role === 'STUDENT') {
			const assessments = await getStudentAssignedAssessments(user.id);
			return json({ assessments });
		}

		return json({ error: 'Forbidden' }, { status: 403 });
	} catch (err: any) {
		console.error('Error fetching assessments:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Please log in to create assessments' }, { status: 401 });
	}

	if (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR') {
		return json(
			{ error: 'Forbidden', message: 'Only trainers or coordinators can create assessments' },
			{ status: 403 }
		);
	}

	try {
		const body = await request.json();
		const assessment = await createAssessment(user.id, body);
		return json({ success: true, assessment }, { status: 201 });
	} catch (err: any) {
		console.error('Error creating assessment:', err);
		return json({ error: 'Bad Request', message: err.message }, { status: 400 });
	}
};
