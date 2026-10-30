import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { getSql, isUuid } from '$lib/server/db';
import { collections, isUsingFallbackStore } from '$lib/server/firebase/collections';

import { departmentsMatch, DEMO_ACCOUNTS } from '$lib/server/services/departmentIds';

function getTrainerDepartment(user: any): string {
	if (user.department) return user.department;
	if (user.customId) {
		const demo = DEMO_ACCOUNTS.find((a) => a.customId.toLowerCase() === user.customId?.toLowerCase());
		if (demo?.department) return demo.department;
	}
	const normId = (user.id || '').toLowerCase();
	if (normId.includes('mca')) return 'MCA';
	if (normId.includes('bca')) return 'BCA';
	if (normId.includes('btech') || normId.includes('cse')) return 'B.Tech CSE';
	return 'MCA';
}

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
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const studentId = params.id;
	if (!studentId) {
		return json({ error: 'Student ID required' }, { status: 400 });
	}

	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { notes, trainer_notes } = body;
	const feedbackText = notes !== undefined ? notes : trainer_notes || '';

	// 1. Validate student and enforce scope
	let studentDoc: any = null;
	let sData: any = null;

	if (!isUsingFallbackStore()) {
		try {
			studentDoc = await collections.students().doc(studentId).get();
			sData = studentDoc.exists ? studentDoc.data() : null;

			if (!sData) {
				const byReg = await collections.students().where('registerNumber', '==', studentId).limit(1).get();
				if (!byReg.empty) {
					studentDoc = byReg.docs[0];
					sData = studentDoc.data();
				} else {
					const byUser = await collections.students().where('userId', '==', studentId).limit(1).get();
					if (!byUser.empty) {
						studentDoc = byUser.docs[0];
						sData = studentDoc.data();
					}
				}
			}
		} catch (err) {
			console.warn('Firestore feedback lookup notice:', err);
		}
	}

	let studentDept = sData?.department;
	if (!studentDept) {
		const sql = getSql();
		if (sql) {
			const isIdUuid = isUuid(studentId);
			const rows = await sql`
				SELECT department FROM students
				WHERE (${isIdUuid} AND (id = ${isIdUuid ? studentId : null} OR user_id = ${isIdUuid ? studentId : null}))
				   OR LOWER(register_number) = ${studentId.toLowerCase()}
				LIMIT 1
			`;
			if (rows.length > 0) {
				studentDept = rows[0].department;
			}
		}
	}

	if (user.role === 'TRAINER') {
		const trainerDept = getTrainerDepartment(user);
		if (studentDept && !departmentsMatch(studentDept, trainerDept)) {
			return json(
				{
					error: 'Forbidden',
					message: `Trainers cannot modify records for students outside their authorized department (${trainerDept}).`
				},
				{ status: 403 }
			);
		}
	}

	// 2. Write to Firestore only if document exists and not using fallback store
	let firestoreSuccess = false;
	if (!isUsingFallbackStore() && studentDoc?.exists) {
		try {
			await collections.students().doc(studentDoc.id).update({
				trainerNotes: feedbackText,
				trainerId: user.id,
				updatedAt: new Date() as any
			});
			firestoreSuccess = true;
		} catch (fsErr) {
			console.warn('Firestore trainer feedback write notice:', fsErr);
		}
	}

	// 2. Write to PostgreSQL if available
	const sql = getSql();
	if (sql) {
		try {
			const trainerUuid = isUuid(user.id) ? user.id : null;
			const isIdUuid = isUuid(studentId);
			const rows = await sql`
				UPDATE students
				SET 
					trainer_notes = ${feedbackText},
					trainer_id = COALESCE(${trainerUuid}, trainer_id),
					updated_at = CURRENT_TIMESTAMP
				WHERE (${isIdUuid} AND (id = ${isIdUuid ? studentId : null} OR user_id = ${isIdUuid ? studentId : null}))
				   OR LOWER(register_number) = ${studentId.toLowerCase()}
				RETURNING id, trainer_notes
			`;

			if (rows.length === 0 && !firestoreSuccess) {
				return json({ error: 'Student not found' }, { status: 404 });
			}

			return json({
				success: true,
				message: 'Feedback updated successfully'
			});
		} catch (err: any) {
			console.error('Error saving trainer feedback to PostgreSQL:', err);
			if (firestoreSuccess) {
				// Firestore succeeded — partial success
				return json({ success: true, message: 'Feedback saved (Firestore only)' });
			}
			return json({ error: 'Server Error', message: err.message }, { status: 500 });
		}
	}

	if (!firestoreSuccess) {
		return json({ error: 'Database unavailable — feedback could not be saved.' }, { status: 503 });
	}

	return json({ success: true, message: 'Feedback updated successfully (Firestore)' });
};
