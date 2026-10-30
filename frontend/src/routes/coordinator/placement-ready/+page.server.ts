import type { PageServerLoad } from './$types';
import { getCoordinatorStudents } from '$lib/server/services/coordinator';
export const load: PageServerLoad = async () => {
	try {
		const allStudents = await getCoordinatorStudents();
		// Filter students who have readiness score >= 75 or readiness status 'Placement Ready'
		const readyStudents = allStudents.filter(
			(s) => (s.readinessScore || 0) >= 70 || s.readinessStatus === 'Placement Ready'
		);
		return {
			students: readyStudents
		};
	} catch (err) {
		console.error('Failed to load placement ready students:', err);
		return {
			students: []
		};
	}
};
