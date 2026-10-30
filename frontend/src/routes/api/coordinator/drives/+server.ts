import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import {
	getPlacementDrives,
	createPlacementDrive,
	updatePlacementDrive
} from '$lib/server/services/coordinator';

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

	if (user.role !== 'PLACEMENT_COORDINATOR' && user.role !== 'STUDENT' && user.role !== 'TRAINER') {
		return json(
			{ error: 'Forbidden', message: 'Only authorized roles can access recruitment drives' },
			{ status: 403 }
		);
	}

	try {
		const drives = await getPlacementDrives();
		return json({ success: true, drives });
	} catch (err: any) {
		console.error('Error fetching drives:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	if (user.role !== 'PLACEMENT_COORDINATOR') {
		return json(
			{ error: 'Forbidden', message: 'Only placement coordinators can schedule recruitment drives' },
			{ status: 403 }
		);
	}

	try {
		const body = await request.json();
		const drive = await createPlacementDrive({
			companyName: body.company || body.companyName,
			title: body.title,
			role: body.role,
			ctcMin: body.minPackage || body.ctcMin,
			ctcMax: body.maxPackage || body.ctcMax,
			skills: body.skills || [],
			driveDate: body.date || body.driveDate,
			applicationOpeningDate: body.applicationOpeningDate || body.openingDate || body.date || body.driveDate,
			applicationDeadline: body.applicationDeadline || body.deadline || body.date || body.driveDate,
			minCgpa: body.minCgpa,
			minReadiness: body.minReadiness,
			targetDepartments: body.targetDepartments,
			targetBatches: body.targetBatches,
			description: body.description,
			status: body.status || 'Active'
		});

		return json({ success: true, drive }, { status: 201 });
	} catch (err: any) {
		console.error('Error creating drive:', err);
		return json({ error: 'Bad Request', message: err.message }, { status: 400 });
	}
};

export const PUT: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	if (user.role !== 'PLACEMENT_COORDINATOR') {
		return json(
			{ error: 'Forbidden', message: 'Only placement coordinators can update recruitment drives' },
			{ status: 403 }
		);
	}

	try {
		const body = await request.json();
		const { id, ...updates } = body;
		if (!id) {
			return json({ error: 'Bad Request', message: 'Drive ID is required' }, { status: 400 });
		}

		const updatedDrive = await updatePlacementDrive(id, updates);
		return json({ success: true, drive: updatedDrive });
	} catch (err: any) {
		console.error('Error updating drive:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};
