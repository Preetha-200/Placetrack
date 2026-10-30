import type { PageServerLoad } from './$types';
import { collections } from '$lib/server/firebase/collections';

export const load: PageServerLoad = async ({ locals }) => {
	let materials: any[] = [];

	try {
		const snap = await collections.studyMaterials().orderBy('createdAt', 'desc').get();
		materials = snap.docs.map((d) => {
			const m = d.data();
			return {
				id: d.id,
				title: m.title,
				description: m.description,
				category: m.category,
				category_label: m.categoryLabel,
				subject: m.subject,
				skill: m.skill,
				target_batch: m.targetBatch,
				target_student_id: m.targetStudentId,
				file_name: m.fileName,
				file_type: m.fileType,
				mime_type: m.mimeType,
				file_size: m.fileSize,
				file_size_formatted: m.fileSizeFormatted,
				storage_path: m.storagePath,
				download_url: m.downloadUrl,
				preview_text: m.previewText,
				uploaded_by_id: m.uploadedBy?.id,
				uploaded_by_name: m.uploadedBy?.name,
				uploaded_by_email: m.uploadedBy?.email,
				downloads_count: m.downloadsCount || 0,
				tags: m.tags || [],
				importance: m.importance || 'Normal',
				created_at: m.createdAt?.toDate ? m.createdAt.toDate() : new Date()
			};
		});
	} catch (err) {
		console.error('Failed to load study materials from Firestore:', err);
	}

	// Filter by student eligibility (batch & individual targeting)
	const studentId = locals.user?.id;
	let studentBatch = 'All';
	if (studentId) {
		try {
			const sDoc = await collections.students().doc(studentId).get();
			if (sDoc.exists) {
				studentBatch = sDoc.data()?.batch || 'All';
			}
		} catch {}
	}

	const authorizedMaterials = materials.filter((m) => {
		if (m.target_student_id && m.target_student_id !== studentId) return false;
		if (m.target_batch && m.target_batch !== 'All' && m.target_batch !== 'All Batches') {
			if (studentBatch !== 'All' && m.target_batch !== studentBatch) return false;
		}
		return true;
	});

	return {
		user: locals.user,
		materials: authorizedMaterials
	};
};
