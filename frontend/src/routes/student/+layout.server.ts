import type { LayoutServerLoad } from './$types';
import { collections, isUsingFallbackStore } from '$lib/server/firebase/collections';
import { getSql, isUuid } from '$lib/server/db';
import { getFallbackStudentDetails } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	let studentDetails: any = null;

	if (user?.id) {
		// 1. Primary: Cloud Firestore
		try {
			const sDoc = await collections.students().doc(user.id).get();
			const uDoc = await collections.users().doc(user.id).get();
			if (sDoc.exists) {
				const s = sDoc.data()!;
				const u = uDoc.exists ? uDoc.data() : null;
				studentDetails = {
					id: sDoc.id,
					user_id: user.id,
					register_number: s.registerNumber || '',
					department: s.department || '',
					course: s.course || '',
					year: s.year ?? null,
					batch: s.batch || '',
					phone: s.phone || '',
					user_name: u?.name || s.name || user.name,
					user_email: u?.email || s.email || user.email,
					is_active: u?.isActive ?? true,
					cgpa: s.cgpa !== undefined && s.cgpa !== null ? Number(s.cgpa) : null,
					readiness_score: s.readinessScore !== undefined && s.readinessScore !== null ? Number(s.readinessScore) : null,
					readiness_status: s.readinessStatus || 'Needs Assessment',
					placement_status: s.placementStatus || 'In Review',
					aptitude_score: s.aptitudeScore !== undefined && s.aptitudeScore !== null ? Number(s.aptitudeScore) : null,
					verbal_score: s.verbalScore !== undefined && s.verbalScore !== null ? Number(s.verbalScore) : null,
					logical_score: s.logicalScore !== undefined && s.logicalScore !== null ? Number(s.logicalScore) : null
				};
			}
		} catch (fsErr) {
			console.warn('Firestore student layout load notice:', fsErr);
		}

		// 2. Secondary Fallback: PostgreSQL
		if (!studentDetails || isUsingFallbackStore()) {
			const sql = getSql();
			if (sql) {
				try {
					const rows = await sql`
						SELECT 
							s.id,
							s.user_id,
							s.register_number,
							s.department,
							s.course,
							s.year,
							s.batch,
							s.phone,
							s.cgpa,
							s.readiness_score,
							s.readiness_status,
							s.placement_status,
							s.aptitude_score,
							s.verbal_score,
							s.logical_score,
							u.name AS user_name,
							u.email AS user_email,
							u.is_active
						FROM students s
						INNER JOIN users u ON u.id = s.user_id
						WHERE s.user_id = ${isUuid(user.id) ? user.id : null}
						   OR s.id = ${isUuid(user.id) ? user.id : null}
						   OR (s.register_number IS NOT NULL AND LOWER(s.register_number) = ${(user.registerNumber || user.id).toLowerCase()})
						LIMIT 1
					`;

					if (rows.length > 0) {
						const s = rows[0];
						studentDetails = {
							id: s.id,
							user_id: s.user_id,
							register_number: s.register_number,
							department: s.department,
							course: s.course,
							year: s.year,
							batch: s.batch,
							phone: s.phone,
							user_name: s.user_name,
							user_email: s.user_email,
							is_active: s.is_active,
							cgpa: s.cgpa !== null && s.cgpa !== undefined ? Number(s.cgpa) : null,
							readiness_score: s.readiness_score !== null && s.readiness_score !== undefined ? Number(s.readiness_score) : null,
							readiness_status: s.readiness_status || 'Needs Assessment',
							placement_status: s.placement_status || 'In Review',
							aptitude_score: s.aptitude_score !== null && s.aptitude_score !== undefined ? Number(s.aptitude_score) : null,
							verbal_score: s.verbal_score !== null && s.verbal_score !== undefined ? Number(s.verbal_score) : null,
							logical_score: s.logical_score !== null && s.logical_score !== undefined ? Number(s.logical_score) : null
						};
					}
				} catch (err) {
					console.warn('PostgreSQL student layout load warning:', err);
				}
			}
		}

		// 3. Fallback: Only for designated demo accounts if present
		if (!studentDetails && user.role === 'STUDENT' && (user as any).customId) {
			studentDetails = getFallbackStudentDetails(user);
		}
	}

	return {
		user,
		studentDetails
	};
};
