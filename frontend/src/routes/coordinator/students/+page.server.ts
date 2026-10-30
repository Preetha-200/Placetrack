import type { PageServerLoad } from './$types';
import { getCoordinatorStudents } from '$lib/server/services/coordinator';

export const load: PageServerLoad = async () => {
	try {
		// Coordinators have cross-department visibility — pass no department filter
		const students = await getCoordinatorStudents(undefined);
		return {
			students
		};
	} catch (err) {
		console.error('Failed to load registered students for coordinator:', err);
		return {
			students: []
		};
	}
};
