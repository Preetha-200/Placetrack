import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { getSql, isUuid } from '$lib/server/db';
import { collections } from '$lib/server/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'node:crypto';

async function getAuthUser(locals: App.Locals, request: Request, cookies: any) {
	if (locals.user) return locals.user;
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
	if (token) return await validateSessionToken(token);
	return null;
}

function formatBytes(bytes: number, decimals = 1): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const GET: RequestHandler = async () => {
	// 1. Primary: Cloud Firestore
	try {
		const snap = await collections.studyMaterials().get();
		if (!snap.empty && snap.docs.length > 0) {
			const materials = snap.docs.map((doc) => {
				const m = doc.data();
				const createdAt = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
				const updatedAt = m.updatedAt?.toDate ? m.updatedAt.toDate() : new Date();
				return {
					id: doc.id,
					title: m.title,
					description: m.description,
					category: m.category,
					category_label: m.categoryLabel,
					subject: m.subject || 'General Studies',
					skill: m.skill || 'Problem Solving',
					target_batch: m.targetBatch,
					target_student_id: m.targetStudentId,
					file_name: m.fileName,
					file_type: m.fileType,
					mime_type: m.mimeType,
					file_size: m.fileSize,
					file_size_formatted: m.fileSizeFormatted,
					preview_text: m.previewText,
					uploaded_by_id: m.uploadedBy?.id || '',
					uploaded_by_name: m.uploadedBy?.name || 'Faculty Trainer',
					uploaded_by_email: m.uploadedBy?.email || '',
					downloads_count: m.downloadsCount || 0,
					tags: m.tags || [],
					importance: m.importance || 'Normal',
					download_url: m.downloadUrl || `/api/materials/${doc.id}/download`,
					created_at: createdAt,
					updated_at: updatedAt
				};
			});

			return json({ materials: materials.sort((a, b) => b.created_at.getTime() - a.created_at.getTime()) });
		}
	} catch (err) {
		console.warn('Firestore study materials fetch notice:', err);
	}

	// 2. Fallback: PostgreSQL
	const sql = getSql();
	if (sql) {
		try {
			const rows = await sql`
				SELECT * FROM study_materials
				ORDER BY created_at DESC
			`;

			const materials = rows.map((m: any) => ({
				id: m.id,
				title: m.title,
				description: m.description,
				category: m.category,
				category_label: m.category_label,
				subject: m.subject || 'General Studies',
				skill: m.skill || 'Problem Solving',
				target_batch: m.target_batch,
				target_student_id: m.target_student_id,
				file_name: m.file_name,
				file_type: m.file_type,
				mime_type: m.mime_type,
				file_size: m.file_size,
				file_size_formatted: m.file_size_formatted,
				preview_text: m.preview_text,
				uploaded_by_id: m.uploaded_by_id,
				uploaded_by_name: m.uploaded_by_name,
				uploaded_by_email: m.uploaded_by_email,
				downloads_count: m.downloads_count || 0,
				tags: m.tags || [],
				importance: m.importance || 'Normal',
				created_at: m.created_at instanceof Date ? m.created_at : new Date(m.created_at),
				updated_at: m.updated_at instanceof Date ? m.updated_at : new Date(m.updated_at)
			}));

			return json({ materials });
		} catch (sqlErr) {
			console.warn('PostgreSQL study materials query notice:', sqlErr);
		}
	}

	return json({ materials: [] });
};

export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	const user = await getAuthUser(locals, request, cookies);
	if (!user || (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR')) {
		return json({ error: 'Forbidden', message: 'Only trainers or coordinators can upload materials' }, { status: 403 });
	}

	const contentType = request.headers.get('content-type') || '';

	try {
		let title = '';
		let description = '';
		let category = 'aptitude';
		let categoryLabel = 'Quantitative Aptitude';
		let subject = 'General Studies';
		let skill = 'Problem Solving';
		let targetBatch = 'All';
		let targetStudentId = 'all';
		let importance = 'Normal';
		let tags: string[] = [];
		let fileName = 'document.pdf';
		let mimeType = 'application/pdf';
		let fileSize = 1024;
		let previewText = '';
		let fileContent = '';

		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			title = (formData.get('title') as string) || '';
			description = (formData.get('description') as string) || '';
			category = (formData.get('category') as string) || 'aptitude';
			categoryLabel = (formData.get('category_label') as string) || (formData.get('categoryLabel') as string) || 'Quantitative Aptitude';
			subject = (formData.get('subject') as string) || 'General Studies';
			skill = (formData.get('skill') as string) || 'Problem Solving';
			targetBatch = (formData.get('target_batch') as string) || (formData.get('targetBatch') as string) || 'All';
			targetStudentId = (formData.get('target_student_id') as string) || (formData.get('targetStudentId') as string) || 'all';
			importance = (formData.get('importance') as string) || 'Normal';
			const rawTags = formData.get('tags');
			if (typeof rawTags === 'string') {
				try {
					tags = JSON.parse(rawTags);
				} catch {
					tags = rawTags.split(',').map((t) => t.trim()).filter(Boolean);
				}
			}

			const file = formData.get('file') as File | null;
			if (file && file.size > 0) {
				fileName = file.name;
				mimeType = file.type || 'application/octet-stream';
				fileSize = file.size;
				if (mimeType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
					fileContent = await file.text();
					previewText = fileContent.substring(0, 500);
				} else {
					fileContent = `[Binary file content for ${fileName}]`;
					previewText = `File: ${fileName} (${mimeType})`;
				}
			}
		} else {
			const jsonBody = await request.json();
			title = jsonBody.title || '';
			description = jsonBody.description || '';
			category = jsonBody.category || 'aptitude';
			categoryLabel = jsonBody.category_label || jsonBody.categoryLabel || 'Quantitative Aptitude';
			subject = jsonBody.subject || 'General Studies';
			skill = jsonBody.skill || 'Problem Solving';
			targetBatch = jsonBody.target_batch || jsonBody.targetBatch || 'All';
			targetStudentId = jsonBody.target_student_id || jsonBody.targetStudentId || 'all';
			importance = jsonBody.importance || 'Normal';
			tags = Array.isArray(jsonBody.tags) ? jsonBody.tags : [];
			fileName = jsonBody.file_name || jsonBody.fileName || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
			mimeType = jsonBody.mime_type || jsonBody.mimeType || 'application/pdf';
			previewText = jsonBody.preview_text || jsonBody.previewText || description;
			fileContent = jsonBody.file_content || jsonBody.fileContent || `# ${title}\n\n${description}`;
			fileSize = Number(jsonBody.file_size || jsonBody.fileSize) || Buffer.byteLength(fileContent, 'utf-8');
		}

		if (!title.trim()) {
			return json({ error: 'Bad Request', message: 'Title is required' }, { status: 400 });
		}
		if (title.length > 200) {
			return json({ error: 'Validation Error', message: 'Title cannot exceed 200 characters' }, { status: 400 });
		}

		// Security: Validate file extension, MIME type, and size
		const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.md'];
		const fileExt = '.' + (fileName.split('.').pop() || '').toLowerCase();
		if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
			return json(
				{
					error: 'InvalidFileType',
					message: `File format not supported. Only documents (.pdf, .docx, .doc, .pptx, .ppt, .txt, .md) are permitted.`
				},
				{ status: 400 }
			);
		}

		const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
		if (fileSize > MAX_FILE_SIZE) {
			return json(
				{
					error: 'PayloadTooLarge',
					message: 'File size exceeds maximum allowed upload limit (25 MB).'
				},
				{ status: 413 }
			);
		}

		// Sanitize file name to prevent directory traversal
		const cleanBase = fileName
			.substring(0, fileName.lastIndexOf('.'))
			.replace(/[^a-zA-Z0-9_\-]/g, '_')
			.substring(0, 80);
		const safeFileName = `${cleanBase}${fileExt}`;

		const fileType = safeFileName.toLowerCase().endsWith('.pdf')
			? 'PDF'
			: safeFileName.toLowerCase().endsWith('.docx') || safeFileName.toLowerCase().endsWith('.doc')
				? 'DOCX'
				: safeFileName.toLowerCase().endsWith('.pptx') || safeFileName.toLowerCase().endsWith('.ppt')
					? 'PPTX'
					: 'Markdown';

		const formattedSize = formatBytes(fileSize);
		const materialId = crypto.randomUUID();
		const now = Timestamp.now();
		const cleanCategory = ['aptitude', 'verbal', 'logical', 'technical'].includes(category) ? category : 'aptitude';
		const safeStoragePath = `studyMaterials/${cleanCategory}/${materialId}_${safeFileName}`;

		// 1. Save in Firestore `studyMaterials` collection (Primary)
		await collections.studyMaterials().doc(materialId).set({
			id: materialId,
			title: title.trim(),
			description: description.trim(),
			category: cleanCategory as any,
			categoryLabel,
			subject,
			skill,
			targetBatch,
			targetStudentId,
			fileName: safeFileName,
			fileType: fileType.toLowerCase() as any,
			mimeType,
			fileSize,
			fileSizeFormatted: formattedSize,
			storagePath: safeStoragePath,
			downloadUrl: `/api/materials/${materialId}/download`,
			previewText,
			uploadedBy: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role
			},
			downloadsCount: 0,
			tags,
			importance: (importance as any) || 'Normal',
			createdAt: now,
			updatedAt: now
		});

		// 2. Dual-replicate to PostgreSQL if available
		const sql = getSql();
		if (sql) {
			try {
				const userUuid = isUuid(user.id) ? user.id : null;
				await sql`
					INSERT INTO study_materials (
						id,
						title,
						description,
						category,
						category_label,
						target_batch,
						target_student_id,
						file_name,
						file_type,
						mime_type,
						file_size,
						file_size_formatted,
						file_content,
						preview_text,
						uploaded_by_id,
						uploaded_by_name,
						uploaded_by_email,
						tags,
						importance,
						subject,
						skill
					) VALUES (
						${materialId},
						${title.trim()},
						${description.trim()},
						${category},
						${categoryLabel},
						${targetBatch},
						${targetStudentId},
						${fileName},
						${fileType},
						${mimeType},
						${fileSize},
						${formattedSize},
						${fileContent},
						${previewText},
						${userUuid},
						${user.name},
						${user.email},
						${tags},
						${importance},
						${subject},
						${skill}
					)
				`;
			} catch (sqlErr) {
				console.warn('PostgreSQL study material replication notice:', sqlErr);
			}
		}

		return json({
			success: true,
			material: {
				id: materialId,
				title,
				description,
				category,
				category_label: categoryLabel,
				subject,
				skill,
				target_batch: targetBatch,
				target_student_id: targetStudentId,
				file_name: fileName,
				file_type: fileType,
				file_size_formatted: formattedSize,
				uploaded_by_name: user.name,
				uploaded_by_email: user.email,
				created_at: new Date()
			}
		}, { status: 201 });
	} catch (err: any) {
		console.error('Error saving study material:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};
