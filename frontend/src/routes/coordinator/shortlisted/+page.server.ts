import type { PageServerLoad } from './$types';
import { getAllApplications, getPlacementDrives, getCoordinatorStudents } from '$lib/server/services/coordinator';

export const load: PageServerLoad = async () => {
	try {
		const [applications, drives, students] = await Promise.all([
			getAllApplications(),
			getPlacementDrives(),
			getCoordinatorStudents()
		]);

		// Filter for shortlisted and higher stages
		const shortlistedStatuses = [
			'Shortlisted',
			'Assessment',
			'Technical Interview',
			'HR Interview',
			'Selected',
			'Offered'
		];

		const shortlistedApps = applications.filter((a) => shortlistedStatuses.includes(a.status));

		return {
			applications: shortlistedApps.map((a) => ({
				...a,
				appliedAt: a.appliedAt instanceof Date ? a.appliedAt.toISOString() : String(a.appliedAt),
				updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : String(a.updatedAt)
			})),
			drives: drives.map((d) => ({
				id: d.id,
				companyName: d.companyName,
				role: d.role,
				ctcDisplay: d.ctcDisplay
			})),
			students: students.map((s) => ({
				id: s.id,
				registerNumber: s.registerNumber,
				name: s.name,
				email: s.email,
				department: s.department,
				batch: s.batch,
				cgpa: s.cgpa,
				readinessScore: s.readinessScore
			}))
		};
	} catch (err) {
		console.error('Failed to load shortlisted candidates:', err);
		return {
			applications: [],
			drives: [],
			students: []
		};
	}
};
