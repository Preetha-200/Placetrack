import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { collections } from '$lib/server/firebase/collections';
import { getSql, isUuid } from '$lib/server/db';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';

export const GET: RequestHandler = async ({ params, locals, request, cookies }) => {
	let user = locals.user;
	if (!user) {
		const authHeader = request.headers.get('authorization');
		const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
		if (token) user = await validateSessionToken(token);
	}

	if (!user) {
		throw error(401, 'Authentication required to download study materials');
	}

	const materialId = params.id;
	if (!materialId) {
		throw error(404, 'Study material not found');
	}

	// 1. Primary: Cloud Firestore
	try {
		const doc = await collections.studyMaterials().doc(materialId).get();
		if (doc.exists) {
			const material = doc.data()!;

			// Permission check for targeted student or batch
			if (user.role === 'STUDENT') {
				if (material.targetStudentId && material.targetStudentId !== 'all' && material.targetStudentId !== user.id) {
					throw error(403, 'You do not have permission to download this study material');
				}
				if (material.targetBatch && material.targetBatch !== 'All' && material.targetBatch !== 'All Batches') {
					let studentBatch = 'All';
					try {
						const sDoc = await collections.students().doc(user.id).get();
						if (sDoc.exists) studentBatch = sDoc.data()?.batch || 'All';
					} catch {}
					if (studentBatch !== 'All' && studentBatch !== material.targetBatch) {
						throw error(403, 'This study material is designated for a different batch');
					}
				}
			}

			// Increment downloads count in Firestore
			try {
				await collections.studyMaterials().doc(materialId).set(
					{
						downloadsCount: (material.downloadsCount || 0) + 1
					},
					{ merge: true }
				);
			} catch (cntErr) {
				console.warn('Failed to increment download count in Firestore:', cntErr);
			}

			const content =
				(material as any).fileContent ||
				material.previewText ||
				`# ${material.title}\n\n${material.description}\n\nCategory: ${material.categoryLabel}`;

			return new Response(content, {
				headers: {
					'Content-Type': material.mimeType || 'text/markdown; charset=utf-8',
					'Content-Disposition': `attachment; filename="${encodeURIComponent(material.fileName || 'document.txt')}"`,
					'Content-Length': Buffer.byteLength(content).toString()
				}
			});
		}
	} catch (err: any) {
		if (err.status === 401 || err.status === 403 || err.status === 404) throw err;
		console.warn('Firestore material download lookup notice:', err);
	}

	// 2. Fallback: PostgreSQL
	const sql = getSql();
	if (sql && isUuid(materialId)) {
		try {
			const rows = await sql`SELECT * FROM study_materials WHERE id = ${materialId} LIMIT 1`;
			if (rows.length > 0) {
				const material = rows[0];

				if (user.role === 'STUDENT') {
					if (material.target_student_id && material.target_student_id !== 'all' && material.target_student_id !== user.id) {
						throw error(403, 'You do not have permission to download this study material');
					}
				}

				try {
					await sql`
						UPDATE study_materials
						SET downloads_count = COALESCE(downloads_count, 0) + 1
						WHERE id = ${materialId}
					`;
				} catch {}

				const content = material.file_content || material.preview_text || `# ${material.title}\n${material.description}`;
				return new Response(content, {
					headers: {
						'Content-Type': material.mime_type || 'text/markdown; charset=utf-8',
						'Content-Disposition': `attachment; filename="${encodeURIComponent(material.file_name || 'document.txt')}"`,
						'Content-Length': Buffer.byteLength(content).toString()
					}
				});
			}
		} catch (pgErr: any) {
			if (pgErr.status === 401 || pgErr.status === 403) throw pgErr;
		}
	}

	throw error(404, 'Study material not found');
};
