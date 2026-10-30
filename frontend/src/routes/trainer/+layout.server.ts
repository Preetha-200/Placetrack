import type { LayoutServerLoad } from './$types';
import { getTrainerAssessments } from '$lib/server/services/assessments';
import { getTrainerTasks } from '$lib/server/services/tasks';
import { getSql } from '$lib/server/db';
import { collections, isUsingFallbackStore } from '$lib/server/firebase/collections';
import { departmentsMatch, batchesMatch, DEMO_ACCOUNTS } from '$lib/server/services/departmentIds';

export const load: LayoutServerLoad = async ({ locals }) => {
	try {
	const user = locals.user;
	let assessments: any[] = [];
	let students: any[] = [];
	let tasks: any[] = [];
	let materials: any[] = [];
	let departmentDrives: any[] = [];
	let appliedStudents: any[] = [];
	let loadError: string | null = null;
	let analytics = {
		totalAssignedStudents: 0,
		assessmentCompletionRate: 0,
		averageAssessmentScore: 0,
		pendingTasksCount: 0,
		submittedTasksCount: 0,
		completedTasksCount: 0,
		studentsRequiringImprovement: 0,
		totalDownloads: 0
	};
	let departments: string[] = [];
	let batches: string[] = [];

	// Determine trainer's authorized department
	let trainerDept = user?.department || '';
	if (!trainerDept && (user as any)?.customId) {
		const demo = DEMO_ACCOUNTS.find((a) => a.customId.toLowerCase() === (user as any).customId?.toLowerCase());
		if (demo) trainerDept = demo.department;
	}
	if (!trainerDept && user?.id) {
		const normId = (user.id || '').toLowerCase();
		if (normId.includes('mca')) trainerDept = 'MCA';
		else if (normId.includes('bca')) trainerDept = 'BCA';
		else if (normId.includes('btech') || normId.includes('cse')) trainerDept = 'B.Tech CSE';
		else trainerDept = 'MCA';
	}
	if (!trainerDept) {
		trainerDept = 'MCA';
	}

	if (user?.id) {
		const isCoordinator = user.role === 'PLACEMENT_COORDINATOR';
		const sql = getSql();

		// 1. Load Trainer Assessments
		try {
			assessments = await getTrainerAssessments(user.id, isCoordinator);
		} catch (err) {
			console.error('Failed to load trainer assessments:', err);
			loadError = 'Could not reach the database, showing no data';
		}

		// 2. Load Trainer Tasks
		try {
			tasks = await getTrainerTasks(user.id, isCoordinator);
		} catch (err) {
			console.error('Failed to load trainer tasks:', err);
		}

		// 3. Load Students Roster from Firestore first, then PostgreSQL
		let allStudents: any[] = [];
		try {
			const stuSnap = await collections.students().get();
			if (!stuSnap.empty && stuSnap.docs.length > 0) {
				allStudents = stuSnap.docs.map((doc) => {
					const s = doc.data();
					return {
						id: doc.id,
						user_id: s.userId || doc.id,
						trainer_id: s.trainerId,
						register_number: s.registerNumber || doc.id,
						department: s.department,
						course: s.course || 'MCA',
						year: s.year || 2,
						batch: s.batch || '2026',
						phone: s.phone,
						cgpa: s.cgpa || 8.0,
						readiness_score: s.readinessScore || 75,
						readiness_status: s.readinessStatus || 'Placement Ready',
						placement_status: s.placementStatus || 'Eligible',
						aptitude_score: s.aptitudeScore || 80,
						verbal_score: s.verbalScore || 75,
						logical_score: s.logicalScore || 80,
						tests_completed: s.testsCompleted || 0,
						attendance_rate: s.attendanceRate || '90%',
						trainer_notes: s.trainerNotes || '',
						target_role: s.targetRole || 'Software Engineer',
						target_ctc: s.targetCtc || '12 LPA',
						name: s.name,
						email: s.email
					};
				});
			}
		} catch (fsErr) {
			console.warn('Firestore students read notice in trainer layout:', fsErr);
		}

		if ((allStudents.length === 0 || isUsingFallbackStore()) && sql) {
			try {
				const rows = await sql`
					SELECT 
						s.id,
						s.user_id,
						s.trainer_id,
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
						s.tests_completed,
						s.attendance_rate,
						s.trainer_notes,
						s.target_role,
						s.target_ctc,
						u.name,
						u.email
					FROM students s
					INNER JOIN users u ON u.id = s.user_id
					ORDER BY s.readiness_score DESC
				`;

				allStudents = rows.map((s: any) => ({
					id: s.id,
					user_id: s.user_id,
					trainer_id: s.trainer_id,
					register_number: s.register_number,
					department: s.department,
					course: s.course,
					year: s.year,
					batch: s.batch,
					phone: s.phone,
					cgpa: s.cgpa,
					readiness_score: s.readiness_score,
					readiness_status: s.readiness_status,
					placement_status: s.placement_status,
					aptitude_score: s.aptitude_score,
					verbal_score: s.verbal_score,
					logical_score: s.logical_score,
					tests_completed: s.tests_completed,
					attendance_rate: s.attendance_rate,
					trainer_notes: s.trainer_notes,
					target_role: s.target_role,
					target_ctc: s.target_ctc,
					name: s.name,
					email: s.email
				}));
			} catch (err) {
				console.error('Failed to load students from PostgreSQL:', err);
			}
		}

		// Strictly scope students to authorized trainer department
		if (!isCoordinator && trainerDept) {
			students = allStudents.filter((s) => departmentsMatch(s.department || '', trainerDept));
		} else {
			students = allStudents;
		}

		// 4. Load Applications for Trainer's Department
		let allApps: any[] = [];
		try {
			const appsSnap = await collections.applications().get();
			if (!appsSnap.empty) {
				allApps = appsSnap.docs.map((d) => {
					const a = d.data();
					return {
						id: d.id,
						applicationId: d.id,
						driveId: a.driveId,
						studentId: a.studentId,
						studentName: a.studentName || 'Student',
						studentReg: a.studentReg || 'REG2024',
						department: a.department || 'MCA',
						batch: (a as any).batch || '2026',
						companyName: a.companyName || 'Corporate',
						role: a.role || 'Software Engineer',
						status: a.status,
						appliedAt: a.appliedAt?.toDate ? a.appliedAt.toDate() : new Date()
					};
				});
			}
		} catch (appsErr) {
			console.warn('Firestore applications lookup notice:', appsErr);
		}

		if ((allApps.length === 0 || isUsingFallbackStore()) && sql) {
			try {
				const rows = await sql`
					SELECT 
						a.id,
						a.drive_id AS "driveId",
						a.student_id AS "studentId",
						a.status,
						a.applied_at AS "appliedAt",
						u.name AS "studentName",
						s.register_number AS "studentReg",
						s.department,
						s.batch,
						c.name AS "companyName",
						d.role
					FROM applications a
					LEFT JOIN students s ON s.id = a.student_id
					LEFT JOIN users u ON u.id = s.user_id
					LEFT JOIN placement_drives d ON d.id = a.drive_id
					LEFT JOIN companies c ON c.id = d.company_id
					ORDER BY a.applied_at DESC
				`;
				allApps = rows.map((r: any) => ({
					id: r.id,
					applicationId: r.id,
					driveId: r.driveId,
					studentId: r.studentId,
					studentName: r.studentName || 'Student',
					studentReg: r.studentReg || 'REG2024',
					department: r.department || 'MCA',
					batch: r.batch || '2026',
					companyName: r.companyName || 'Corporate',
					role: r.role || 'Software Engineer',
					status: r.status,
					appliedAt: r.appliedAt instanceof Date ? r.appliedAt : new Date(r.appliedAt)
				}));
			} catch {}
		}

		// Scope applied students strictly to trainer's department
		appliedStudents = allApps.filter((a) => isCoordinator || departmentsMatch(a.department || '', trainerDept));

		// 5. Load Placement Drives Matching Trainer's Department
		let allDrives: any[] = [];
		try {
			const drivesSnap = await collections.placementDrives().get();
			if (!drivesSnap.empty) {
				allDrives = drivesSnap.docs.map((d) => {
					const r = d.data();
					return {
						id: d.id,
						companyId: r.companyId,
						companyName: r.companyName,
						role: r.role,
						status: r.status,
						driveDate: typeof (r as any).driveDate?.toDate === 'function' ? (r as any).driveDate.toDate().toISOString().split('T')[0] : String(r.driveDate || ''),
						applicationDeadline: r.applicationDeadline || r.driveDate,
						ctcDisplay: r.ctcDisplay || (r.ctcMin && r.ctcMax ? `${r.ctcMin} - ${r.ctcMax} LPA` : '6 - 12 LPA'),
						minCgpa: Number(r.minCgpa) || 7.0,
						minReadiness: Number(r.minReadiness) || 70,
						targetDepartments: r.targetDepartments || ['Master of Computer Applications (MCA)'],
						targetBatches: r.targetBatches || ['2026'],
						skills: r.skills || [],
						description: r.description || ''
					};
				});
			}
		} catch (drivesErr) {
			console.warn('Firestore drives query notice:', drivesErr);
		}

		if ((allDrives.length === 0 || isUsingFallbackStore()) && sql) {
			try {
				const dRows = await sql`
					SELECT d.*, c.name AS company_name
					FROM placement_drives d
					LEFT JOIN companies c ON c.id = d.company_id
					ORDER BY d.drive_date ASC
				`;
				allDrives = dRows.map((r: any) => ({
					id: r.id,
					companyId: r.company_id,
					companyName: r.company_name,
					role: r.role,
					status: r.status,
					driveDate: r.drive_date instanceof Date ? r.drive_date.toISOString().split('T')[0] : String(r.drive_date || ''),
					applicationDeadline: r.application_deadline instanceof Date ? r.application_deadline.toISOString().split('T')[0] : String(r.application_deadline || r.drive_date || ''),
					ctcDisplay: `${r.min_ctc || 6} - ${r.max_ctc || 12} LPA`,
					minCgpa: Number(r.min_cgpa) || 7.0,
					minReadiness: 70,
					targetDepartments: r.target_departments || ['Master of Computer Applications (MCA)'],
					targetBatches: ['2026', '2024-2026'],
					skills: ['Java', 'SQL', 'Python'],
					description: `Campus recruitment drive for ${r.role} at ${r.company_name}`
				}));
			} catch (dErr) {
				console.warn('PostgreSQL drives fallback notice in trainer layout:', dErr);
			}
		}

		// Filter opportunities matching trainer's department
		const matchedDrives = allDrives.filter(
			(d) => isCoordinator || departmentsMatch(trainerDept, d.targetDepartments || [])
		);

		departmentDrives = matchedDrives.map((d) => {
			const targetDepts = d.targetDepartments || [];
			const targetBatches = d.targetBatches || ['2026'];
			const minCgpa = d.minCgpa !== undefined ? Number(d.minCgpa) : 7.0;

			// Count eligible students from trainer's authorized department
			const eligibleCount = students.filter((s) => {
				const meetsBatch = batchesMatch(s.batch || '', targetBatches);
				const meetsCgpa = (Number(s.cgpa) || 0) >= minCgpa;
				return meetsBatch && meetsCgpa;
			}).length;

			// Count department applicants for this drive
			const driveApps = appliedStudents.filter((a) => a.driveId === d.id);
			const appliedCount = driveApps.length;

			// Application status summary
			const statusCounts: Record<string, number> = {};
			for (const a of driveApps) {
				statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
			}
			const statusParts = Object.entries(statusCounts).map(([st, cnt]) => `${cnt} ${st}`);
			const statusSummary = statusParts.length > 0 ? statusParts.join(', ') : `${appliedCount} Applied`;

			return {
				id: d.id,
				companyName: d.companyName,
				role: d.role,
				title: d.title || `${d.companyName} Campus Recruitment Drive`,
				package: d.ctcDisplay || '10 - 15 LPA',
				driveDate: d.driveDate,
				applicationDeadline: d.applicationDeadline || d.driveDate,
				minCgpa,
				minReadiness: d.minReadiness || 70,
				targetDepartments: targetDepts,
				targetBatches,
				skills: d.skills || [],
				description: d.description || '',
				status: d.status || 'Active',
				eligibleStudentsCount: eligibleCount,
				appliedStudentsCount: appliedCount,
				statusSummary
			};
		});

		// 6. Load Study Materials (Firestore-first, PostgreSQL fallback)
		try {
			const matSnap = await collections.studyMaterials().get();
			if (!matSnap.empty) {
				materials = matSnap.docs.map((d) => {
					const m = d.data();
					return {
						id: d.id,
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
						download_url: m.downloadUrl || `/api/materials/${d.id}/download`,
						created_at: m.createdAt?.toDate ? m.createdAt.toDate() : new Date(),
						updated_at: m.updatedAt?.toDate ? m.updatedAt.toDate() : new Date()
					};
				});
			}
		} catch (fsMatErr) {
			console.warn('Firestore study materials notice in trainer layout:', fsMatErr);
		}

		if ((materials.length === 0 || isUsingFallbackStore()) && sql) {
			try {
				const mRows = await sql`SELECT * FROM study_materials ORDER BY created_at DESC`;
				materials = mRows.map((m: any) => ({
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
					download_url: `/api/materials/${m.id}/download`,
					created_at: m.created_at instanceof Date ? m.created_at : new Date(m.created_at),
					updated_at: m.updated_at instanceof Date ? m.updated_at : new Date(m.updated_at)
				}));
			} catch (mErr) {
				console.warn('Study materials PostgreSQL fallback notice in trainer layout:', mErr);
			}
		}

		// 7. Compute Live Analytics Scoped to Department
		const pendingTasks = tasks.filter((t) => (t.status || '').toLowerCase() === 'pending').length;
		const submittedTasks = tasks.filter((t) => (t.status || '').toLowerCase() === 'submitted').length;
		const completedTasks = tasks.filter((t) => (t.status || '').toLowerCase() === 'completed').length;
		const needingImprovement = students.filter(
			(s) => Number(s.readiness_score) < 75 || s.readiness_status === 'Needs Improvement'
		).length;
		const totalDownloads = materials.reduce((sum, m) => sum + (Number(m.downloads_count) || 0), 0) || 0;

		// Compute real completion rate: students with at least one completed assessment / total students
		const studentsWithCompletions = students.filter(
			(s) => Number(s.tests_completed) > 0 || Number(s.readiness_score) > 0
		).length;
		const computedCompletionRate =
			students.length > 0 ? Math.round((studentsWithCompletions / students.length) * 100) : 0;

		// Compute real average score from student readiness scores
		const avgScore =
			students.length > 0
				? Math.round(
						students.reduce((sum, s) => sum + (Number(s.readiness_score) || 0), 0) / students.length
					)
				: 0;

		analytics = {
			totalAssignedStudents: students.length,
			assessmentCompletionRate: computedCompletionRate,
			averageAssessmentScore: avgScore,
			pendingTasksCount: pendingTasks,
			submittedTasksCount: submittedTasks,
			completedTasksCount: completedTasks,
			studentsRequiringImprovement: needingImprovement,
			totalDownloads
		};

		departments = Array.from(new Set(students.map((s) => s.department).filter(Boolean)));
		batches = Array.from(new Set(students.map((s) => s.batch).filter(Boolean)));
	}

		return {
			user,
			trainerDepartment: trainerDept,
			assessments,
			students,
			tasks,
			materials,
			departmentDrives,
			appliedStudents,
			analytics,
			departments,
			batches,
			loadError
		};
	} catch (err: any) {
		console.error('FATAL TRAINER LAYOUT LOAD ERROR:', err);
		return {
			user: locals.user,
			trainerDepartment: 'MCA',
			assessments: [],
			students: [],
			tasks: [],
			materials: [],
			departmentDrives: [],
			appliedStudents: [],
			analytics: {
				totalAssignedStudents: 0,
				assessmentCompletionRate: 0,
				averageAssessmentScore: 0,
				pendingTasksCount: 0,
				submittedTasksCount: 0,
				completedTasksCount: 0,
				studentsRequiringImprovement: 0,
				totalDownloads: 0
			},
			departments: ['MCA'],
			batches: ['2024–2026'],
			loadError: err?.message || 'Error loading trainer portal'
		};
	}
};
