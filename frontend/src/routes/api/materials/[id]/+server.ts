import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { collections } from '$lib/server/firebase/collections';
import { getSql, isUuid } from '$lib/server/db';

async function getAuthUser(locals: App.Locals, request: Request, cookies: any) {
	if (locals.user) return locals.user;
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
	if (token) return await validateSessionToken(token);
	return null;
}

export const GET: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthUser(locals, request, cookies);
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	const id = params.id;
	if (!id) {
		return json({ error: 'Not Found', message: 'Material not found' }, { status: 404 });
	}

	// 1. Primary: Cloud Firestore
	try {
		const doc = await collections.studyMaterials().doc(id).get();
		if (doc.exists) {
			const m = doc.data()!;
			return json({
				material: {
					id: doc.id,
					title: m.title,
					description: m.description,
					category: m.category,
					category_label: m.categoryLabel,
					subject: m.subject || '',
					skill: m.skill || '',
					target_batch: m.targetBatch,
					target_student_id: m.targetStudentId,
					file_name: m.fileName,
					file_type: m.fileType,
					mime_type: m.mimeType,
					file_size: m.fileSize,
					file_size_formatted: m.fileSizeFormatted,
					preview_text: m.previewText,
					uploaded_by_id: m.uploadedBy?.id || '',
					uploaded_by_name: m.uploadedBy?.name || '',
					uploaded_by_email: m.uploadedBy?.email || '',
					downloads_count: m.downloadsCount || 0,
					tags: m.tags || [],
					importance: m.importance || 'Normal',
					download_url: m.downloadUrl || `/api/materials/${doc.id}/download`,
					created_at: m.createdAt?.toDate ? m.createdAt.toDate() : new Date()
				}
			});
		}
	} catch (err) {
		console.warn('Firestore study material lookup notice:', err);
	}

	// 2. Fallback: PostgreSQL
	const sql = getSql();
	if (sql && isUuid(id)) {
		try {
			const rows = await sql`SELECT * FROM study_materials WHERE id = ${id} LIMIT 1`;
			if (rows.length > 0) {
				return json({ material: rows[0] });
			}
		} catch {
			// Ignore
		}
	}

	return json({ error: 'Not Found', message: 'Material not found' }, { status: 404 });
};

export const DELETE: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthUser(locals, request, cookies);
	if (!user || (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR')) {
		return json({ error: 'Forbidden', message: 'Only trainers or coordinators can delete materials' }, { status: 403 });
	}

	const id = params.id;
	if (!id) {
		return json({ error: 'Not Found', message: 'Material not found' }, { status: 404 });
	}

	// Verify existence and trainer ownership
	const doc = await collections.studyMaterials().doc(id).get();
	if (!doc.exists) {
		return json({ error: 'Not Found', message: 'Material not found' }, { status: 404 });
	}
	const mData = doc.data()!;
	if (user.role === 'TRAINER' && mData.uploadedBy?.id && mData.uploadedBy.id !== user.id) {
		return json({ error: 'Forbidden', message: 'You can only delete study materials that you uploaded' }, { status: 403 });
	}

	// 1. Delete from Firestore
	try {
		await collections.studyMaterials().doc(id).delete();
	} catch (err) {
		console.warn('Firestore delete notice:', err);
	}

	// 2. Delete from PostgreSQL
	const sql = getSql();
	if (sql && isUuid(id)) {
		try {
			await sql`DELETE FROM study_materials WHERE id = ${id}`;
		} catch (err: any) {
			console.warn('PostgreSQL delete notice:', err);
		}
	}

	return json({ success: true, message: 'Material deleted successfully' });
};
