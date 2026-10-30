import type { PageServerLoad } from './$types';
import { getStudentAssignedAssessments } from '$lib/server/services/assessments';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	let assessments: any[] = [];

	if (user?.id) {
		try {
			assessments = await getStudentAssignedAssessments(user.id);
		} catch (err) {
			console.error('Failed to load student assessments from PostgreSQL:', err);
		}
	}

	return {
		user,
		assessments
	};
};
