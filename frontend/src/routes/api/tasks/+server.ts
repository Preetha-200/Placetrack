import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { getTrainerTasks, getStudentTasks, createTask } from '$lib/server/services/tasks';

async function getAuthUser(locals: App.Locals, request: Request, cookies: any) {
	if (locals.user) return locals.user;
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
	if (token) return await validateSessionToken(token);
	return null;
}

export const GET: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	try {
		if (user.role === 'STUDENT') {
			const tasks = await getStudentTasks(user.id);
			return json({ success: true, tasks });
		} else if (user.role === 'TRAINER' || user.role === 'PLACEMENT_COORDINATOR') {
			const isCoordinator = user.role === 'PLACEMENT_COORDINATOR';
			const tasks = await getTrainerTasks(user.id, isCoordinator);
			return json({ success: true, tasks });
		}
		return json({ error: 'Forbidden', message: 'Access denied' }, { status: 403 });
	} catch (err: any) {
		console.error('Error fetching tasks:', err);
		return json({ error: 'Server Error', message: 'Failed to fetch tasks' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthUser(locals, request, cookies);
	if (!user || (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR')) {
		return json({ error: 'Forbidden', message: 'Only trainers can create tasks' }, { status: 403 });
	}

	try {
		const body = await request.json();

		if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
			return json({ error: 'Validation Error', message: 'Task title is required' }, { status: 400 });
		}
		if (body.title.length > 200) {
			return json({ error: 'Validation Error', message: 'Task title cannot exceed 200 characters' }, { status: 400 });
		}
		if (!body.category || !['aptitude', 'verbal', 'logical', 'technical'].includes(body.category)) {
			return json({ error: 'Validation Error', message: 'Category must be one of: aptitude, verbal, logical, technical' }, { status: 400 });
		}

		const task = await createTask(user.id, body);
		return json({ success: true, task }, { status: 201 });
	} catch (err: any) {
		console.error('Error creating task:', err);
		return json({ error: 'Validation Error', message: err.message || 'Failed to create task' }, { status: 400 });
	}
};
