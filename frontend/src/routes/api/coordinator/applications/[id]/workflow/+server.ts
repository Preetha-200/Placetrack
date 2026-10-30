import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { updateApplicationWorkflow } from '$lib/server/services/coordinator';

async function getAuthenticatedUser(locals: App.Locals, request: Request, cookies: any) {
	if (locals.user) return locals.user;
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
	if (token) return await validateSessionToken(token);
	return null;
}

export type ApplicationWorkflowStatus =
	| 'Applied'
	| 'Shortlisted'
	| 'Assessment'
	| 'Technical Interview'
	| 'HR Interview'
	| 'Selected'
	| 'Rejected'
	| 'Offered';

const VALID_STATUSES: ApplicationWorkflowStatus[] = [
	'Applied',
	'Shortlisted',
	'Assessment',
	'Technical Interview',
	'HR Interview',
	'Selected',
	'Rejected',
	'Offered'
];

export const POST: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	if (user.role !== 'PLACEMENT_COORDINATOR') {
		return json({ error: 'Forbidden', message: 'Only placement coordinators can update application workflow' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { status, interviewDate, interviewTime, assessmentScore, notes, ctcOffered } = body;

		if (!status || !VALID_STATUSES.includes(status)) {
			return json(
				{
					error: 'Validation Error',
					message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
				},
				{ status: 400 }
			);
		}

		const updated = await updateApplicationWorkflow(params.id, status, {
			interviewDate,
			interviewTime,
			assessmentScore: assessmentScore !== undefined ? Number(assessmentScore) : undefined,
			notes,
			ctcOffered: ctcOffered !== undefined ? Number(ctcOffered) : undefined
		});

		return json({ success: true, application: updated });
	} catch (err: any) {
		console.error('Error updating application workflow:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 400 });
	}
};
