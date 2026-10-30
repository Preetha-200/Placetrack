import type { PageServerLoad } from './$types';
import { getAllApplications, getPlacementDrives, getCoordinatorStudents } from '$lib/server/services/coordinator';

export const load: PageServerLoad = async () => {
	try {
		const [applications, drives, students] = await Promise.all([
			getAllApplications(),
			getPlacementDrives(),
			getCoordinatorStudents()
		]);

		return {
			applications: applications.map((a) => ({
				...a,
				appliedAt: a.appliedAt instanceof Date ? a.appliedAt.toISOString() : String(a.appliedAt),
				updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : String(a.updatedAt)
			})),
			drives: drives.map((d) => ({
				id: d.id,
				title: d.title,
				companyName: d.companyName,
				role: d.role,
				status: d.status,
				ctcDisplay: d.ctcDisplay,
				driveDate: d.driveDate,
				applicationDeadline: d.applicationDeadline
			})),
			students: students.map((s) => ({
				id: s.id,
				userId: s.userId,
				name: s.name,
				registerNumber: s.registerNumber,
				email: s.email,
				department: s.department,
				batch: s.batch,
				cgpa: s.cgpa,
				readinessScore: s.readinessScore,
				placementStatus: s.placementStatus
			}))
		};
	} catch (err) {
		console.error('Failed to load coordinator applications:', err);
		return {
			applications: [],
			drives: [],
			students: []
		};
	}
};
