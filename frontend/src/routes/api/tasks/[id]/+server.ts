import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { updateTask, deleteTask } from '$lib/server/services/tasks';

async function getAuthUser(locals: App.Locals, request: Request, cookies: any) {
	if (locals.user) return locals.user;
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
	if (token) return await validateSessionToken(token);
	return null;
}

export const PUT: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthUser(locals, request, cookies);
	if (!user || (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR')) {
		return json({ error: 'Forbidden', message: 'Only trainers can modify tasks' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const isCoordinator = user.role === 'PLACEMENT_COORDINATOR';
		const updated = await updateTask(params.id, user.id, body, isCoordinator);
		return json({ success: true, task: updated });
	} catch (err: any) {
		console.error('Error updating task:', err);
		return json({ error: 'Update Error', message: err.message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthUser(locals, request, cookies);
	if (!user || (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR')) {
		return json({ error: 'Forbidden', message: 'Only trainers can delete tasks' }, { status: 403 });
	}

	try {
		const isCoordinator = user.role === 'PLACEMENT_COORDINATOR';
		await deleteTask(params.id, user.id, isCoordinator);
		return json({ success: true, message: 'Task deleted successfully' });
	} catch (err: any) {
		console.error('Error deleting task:', err);
		return json({ error: 'Delete Error', message: err.message }, { status: 400 });
	}
};
