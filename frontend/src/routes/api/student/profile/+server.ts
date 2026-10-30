import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { collections } from '$lib/server/firebase/collections';
import { getSql, isUuid } from '$lib/server/db';
import { Timestamp } from 'firebase-admin/firestore';

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
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// 1. Primary: Cloud Firestore
	try {
		const sDoc = await collections.students().doc(user.id).get();
		const uDoc = await collections.users().doc(user.id).get();
		if (sDoc.exists) {
			const s = sDoc.data()!;
			const u = uDoc.exists ? uDoc.data() : null;
			return json({
				student: {
					id: sDoc.id,
					user_id: user.id,
					register_number: s.registerNumber,
					department: s.department,
					course: s.course,
					year: s.year,
					batch: s.batch,
					phone: s.phone,
					cgpa: s.cgpa,
					bio: s.bio,
					target_role: s.targetRole,
					target_ctc: s.targetCtc,
					readiness_score: s.readinessScore,
					readiness_status: s.readinessStatus,
					placement_status: s.placementStatus,
					aptitude_score: s.aptitudeScore,
					verbal_score: s.verbalScore,
					logical_score: s.logicalScore,
					technical_score: s.technicalScore,
					user_name: u?.name || s.name || user.name,
					user_email: u?.email || s.email || user.email
				}
			});
		}
	} catch (err) {
		console.warn('Firestore student profile read notice:', err);
	}

	// 2. Fallback: PostgreSQL
	const sql = getSql();
	if (sql && isUuid(user.id)) {
		try {
			const rows = await sql`
				SELECT 
					s.*,
					u.name AS user_name,
					u.email AS user_email
				FROM students s
				INNER JOIN users u ON u.id = s.user_id
				WHERE s.user_id = ${user.id} OR s.id = ${user.id}
				LIMIT 1
			`;

			if (rows.length > 0) {
				const student = rows[0];
				return json({
					student: {
						...student,
						id: student.id,
						user_id: student.user_id,
						register_number: student.register_number,
						target_role: student.target_role,
						target_ctc: student.target_ctc,
						readiness_score: student.readiness_score,
						readiness_status: student.readiness_status,
						placement_status: student.placement_status,
						user_name: student.user_name,
						user_email: student.user_email
					}
				});
			}
		} catch (err: any) {
			console.warn('PostgreSQL student profile read notice:', err);
		}
	}

	return json({ student: null, isFallback: true });
};

export const PUT: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthenticatedUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	if (user.role !== 'STUDENT') {
		return json({ error: 'Forbidden', message: 'Only students can modify their student profile' }, { status: 403 });
	}

	try {
		const body = await request.json();

		// Security: Strict allow-list of mutable profile fields.
		// Any protected academic, placement, or security fields (role, cgpa, readinessScore, etc.)
		// are automatically ignored and never written to the database.
		const { name, phone, bio, targetRole, targetCtc } = body;

		// Input validation & sanitization
		if (name !== undefined) {
			if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
				return json({ error: 'Validation Error', message: 'Name must be between 1 and 100 characters' }, { status: 400 });
			}
		}
		if (phone !== undefined && phone !== null) {
			if (typeof phone !== 'string' || phone.length > 25 || !/^[+0-9\s\-()]*$/.test(phone)) {
				return json({ error: 'Validation Error', message: 'Invalid phone number format' }, { status: 400 });
			}
		}
		if (bio !== undefined && bio !== null) {
			if (typeof bio !== 'string' || bio.length > 1500) {
				return json({ error: 'Validation Error', message: 'Bio cannot exceed 1500 characters' }, { status: 400 });
			}
		}
		if (targetRole !== undefined && targetRole !== null) {
			if (typeof targetRole !== 'string' || targetRole.length > 100) {
				return json({ error: 'Validation Error', message: 'Target role cannot exceed 100 characters' }, { status: 400 });
			}
		}
		if (targetCtc !== undefined && targetCtc !== null) {
			if (typeof targetCtc !== 'string' || targetCtc.length > 50) {
				return json({ error: 'Validation Error', message: 'Target CTC cannot exceed 50 characters' }, { status: 400 });
			}
		}

		const now = Timestamp.now();

		// 1. Primary: Cloud Firestore
		let firestoreSaved = false;
		try {
			if (name && name.trim()) {
				await collections.users().doc(user.id).set(
					{
						name: name.trim(),
						updatedAt: now
					},
					{ merge: true }
				);
			}

			const studentUpdates: Record<string, any> = { updatedAt: now };
			if (phone !== undefined) studentUpdates.phone = (phone || '').trim();
			if (bio !== undefined) studentUpdates.bio = (bio || '').trim();
			if (targetRole !== undefined) studentUpdates.targetRole = (targetRole || '').trim();
			if (targetCtc !== undefined) studentUpdates.targetCtc = (targetCtc || '').trim();

			await collections.students().doc(user.id).set(studentUpdates, { merge: true });
			firestoreSaved = true;
		} catch (fsErr) {
			console.warn('Firestore profile update notice:', fsErr);
		}

		// 2. Sync: PostgreSQL (if available)
		const sql = getSql();
		if (sql && isUuid(user.id)) {
			try {
				if (name && name.trim()) {
					await sql`
						UPDATE users
						SET name = ${name.trim()}, updated_at = CURRENT_TIMESTAMP
						WHERE id = ${user.id}
					`;
				}

				await sql`
					UPDATE students
					SET 
						phone = COALESCE(${phone ? phone.trim() : null}, phone),
						bio = COALESCE(${bio ? bio.trim() : null}, bio),
						target_role = COALESCE(${targetRole ? targetRole.trim() : null}, target_role),
						target_ctc = COALESCE(${targetCtc ? targetCtc.trim() : null}, target_ctc),
						updated_at = CURRENT_TIMESTAMP
					WHERE user_id = ${user.id} OR id = ${user.id}
				`;
			} catch (sqlErr) {
				console.warn('PostgreSQL student profile sync notice:', sqlErr);
			}
		}

		if (firestoreSaved) {
			return json({ success: true, message: 'Profile updated in database successfully' });
		}

		return json({ success: true, message: 'Profile updated' });
	} catch (err: any) {
		console.error('Error updating student profile:', err);
		return json({ error: 'Update Failed', message: 'Unable to update profile. Please verify your input.' }, { status: 400 });
	}
};
