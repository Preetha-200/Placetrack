import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { collections, isUsingFallbackStore } from '$lib/server/firebase/collections';
import { getSql, isUuid } from '$lib/server/db';

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

export const GET: RequestHandler = async ({ params, locals, request, cookies }) => {
	const user = await getAuthUser(locals, request, cookies);
	if (!user || (user.role !== 'TRAINER' && user.role !== 'PLACEMENT_COORDINATOR')) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const studentId = params.id;
	if (!studentId) {
		return json({ error: 'Student ID required' }, { status: 400 });
	}

	// 1. Primary: Cloud Firestore
	if (!isUsingFallbackStore()) {
		try {
			let studentDoc = await collections.students().doc(studentId).get();
			let sData = studentDoc.exists ? studentDoc.data() : null;

			if (!sData) {
				// Try lookup by registerNumber or userId
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

			if (sData && sData.department) {
			// Strictly enforce trainer department authorization
			if (user.role === 'TRAINER') {
				const trainerDept = getTrainerDepartment(user);
				if (!departmentsMatch(sData.department || '', trainerDept)) {
					return json(
						{
							error: 'Forbidden',
							message: `Trainers cannot access student records outside their authorized department (${trainerDept}).`
						},
						{ status: 403 }
					);
				}
			}

			const resolvedUserId = sData.userId || studentDoc.id;
			const uDoc = await collections.users().doc(resolvedUserId).get();
			const uData = uDoc.exists ? uDoc.data() : null;

			// Fetch assessment attempts
			const [attSnap, tasksSnap] = await Promise.all([
				collections.assessmentAttempts().where('studentId', '==', resolvedUserId).get(),
				collections.tasks().get()
			]);

			const assessmentHistory = attSnap.docs.map((d) => {
				const att = d.data();
				const startedAt = att.startedAt?.toDate ? att.startedAt.toDate() : null;
				const submittedAt = att.submittedAt?.toDate ? att.submittedAt.toDate() : null;
				return {
					attempt_id: d.id,
					assessment_id: att.assessmentId,
					score: att.score,
					max_score: att.maxScore,
					percentage: att.percentage,
					status: att.status,
					time_spent_seconds: att.timeSpentSeconds || 0,
					started_at: startedAt,
					submitted_at: submittedAt,
					assessment_title: att.assessmentTitle || 'Assessment',
					assessment_category: att.assessmentCategory || 'General',
					difficulty_level: 'Intermediate',
					duration_minutes: 30,
					total_questions: att.totalQuestions || 0
				};
			});

			assessmentHistory.sort((a, b) => {
				const tA = a.submitted_at ? a.submitted_at.getTime() : 0;
				const tB = b.submitted_at ? b.submitted_at.getTime() : 0;
				return tB - tA;
			});

			const studentBatch = sData.batch || '2026';
			const formattedTasks = tasksSnap.docs
				.map((d) => {
					const t = d.data();
					return {
						id: d.id,
						title: t.title,
						description: t.description,
						category: t.category,
						category_label: t.categoryLabel,
						priority: t.priority,
						due_date: t.dueDate,
						status: t.status,
						score: t.score,
						trainer_feedback: t.trainerFeedback,
						created_at: t.createdAt?.toDate ? t.createdAt.toDate() : new Date(),
						studentId: t.studentId,
						targetBatch: t.targetBatch
					};
				})
				.filter((t) => {
					return (
						t.studentId === resolvedUserId ||
						!t.studentId ||
						t.targetBatch === 'All' ||
						t.targetBatch === 'All Batches' ||
						t.targetBatch === studentBatch
					);
				});

			const aptScore = Number(sData.aptitudeScore) || 80;
			const vrbScore = Number(sData.verbalScore) || 85;
			const logScore = Number(sData.logicalScore) || 78;

			const categorySummary = {
				aptitude: {
					score: aptScore,
					level: aptScore >= 80 ? 'Advanced' : aptScore >= 65 ? 'Intermediate' : 'Beginner',
					label: 'Quantitative Aptitude'
				},
				verbal: {
					score: vrbScore,
					level: vrbScore >= 80 ? 'Advanced' : vrbScore >= 65 ? 'Intermediate' : 'Beginner',
					label: 'Verbal Ability'
				},
				logical: {
					score: logScore,
					level: logScore >= 80 ? 'Advanced' : logScore >= 65 ? 'Intermediate' : 'Beginner',
					label: 'Logical Reasoning'
				}
			};

			return json({
				success: true,
				student: {
					id: studentDoc.id,
					user_id: resolvedUserId,
					name: sData.name || uData?.name || 'Student',
					email: sData.email || uData?.email || '',
					register_number: sData.registerNumber,
					department: sData.department,
					course: sData.course || 'MCA',
					year: sData.year || 2,
					batch: sData.batch || '2026',
					phone: sData.phone || '',
					cgpa: sData.cgpa || 8.0,
					aptitude_score: aptScore,
					verbal_score: vrbScore,
					logical_score: logScore,
					readiness_score: sData.readinessScore || 75,
					readiness_status: sData.readinessStatus || 'Placement Ready',
					placement_status: sData.placementStatus || 'Eligible',
					trainer_notes: sData.trainerNotes || ''
				},
				categorySummary,
				assessmentHistory,
				tasks: formattedTasks
			});
		}
	} catch (err) {
		console.warn('Firestore student performance lookup notice:', err);
	}
}

	// 2. Fallback: PostgreSQL
	const sql = getSql();
	if (!sql) {
		return json({ error: 'Student not found' }, { status: 404 });
	}

	try {
		const isIdUuid = isUuid(studentId);
		const studentRows = await sql`
			SELECT 
				s.*,
				u.name,
				u.email
			FROM students s
			INNER JOIN users u ON u.id = s.user_id
			WHERE (${isIdUuid} AND (s.id = ${isIdUuid ? studentId : null} OR s.user_id = ${isIdUuid ? studentId : null}))
			   OR LOWER(s.register_number) = ${studentId.toLowerCase()}
			LIMIT 1
		`;

		if (studentRows.length === 0) {
			return json({ error: 'Student not found' }, { status: 404 });
		}
		const student = studentRows[0];

		// Strictly enforce trainer department authorization on fallback
		if (user.role === 'TRAINER') {
			const trainerDept = getTrainerDepartment(user);
			if (!departmentsMatch(student.department || '', trainerDept)) {
				return json(
					{
						error: 'Forbidden',
						message: `Trainers cannot access student records outside their authorized department (${trainerDept}).`
					},
					{ status: 403 }
				);
			}
		}

		const resolvedStudentId = student.id;

		const attempts = await sql`
			SELECT 
				att.id AS attempt_id,
				att.assessment_id,
				att.score,
				att.max_score,
				att.percentage,
				att.status,
				att.time_spent_seconds,
				att.started_at,
				att.submitted_at,
				a.title AS assessment_title,
				a.category AS assessment_category,
				a.difficulty_level,
				a.duration_minutes,
				a.total_questions
			FROM assessment_attempts att
			LEFT JOIN assessments a ON a.id = att.assessment_id
			WHERE att.student_id = ${resolvedStudentId}
			ORDER BY att.created_at DESC
		`;

		const assessmentHistory = attempts.map((att: any) => ({
			attempt_id: att.attempt_id,
			assessment_id: att.assessment_id,
			score: att.score,
			max_score: att.max_score,
			percentage: att.percentage,
			status: att.status,
			time_spent_seconds: att.time_spent_seconds,
			started_at: att.started_at instanceof Date ? att.started_at : (att.started_at ? new Date(att.started_at) : null),
			submitted_at: att.submitted_at instanceof Date ? att.submitted_at : (att.submitted_at ? new Date(att.submitted_at) : null),
			assessment_title: att.assessment_title,
			assessment_category: att.assessment_category,
			difficulty_level: att.difficulty_level || 'Intermediate',
			duration_minutes: att.duration_minutes || 30,
			total_questions: att.total_questions || 0
		}));

		const tasks = await sql`
			SELECT *
			FROM trainer_tasks
			WHERE student_id = ${resolvedStudentId}
			   OR student_id IS NULL
			   OR target_batch = 'All'
			   OR target_batch = 'All Batches'
			   OR target_batch = ${student.batch}
			ORDER BY created_at DESC
		`;

		const formattedTasks = tasks.map((t: any) => ({
			id: t.id,
			title: t.title,
			description: t.description,
			category: t.category,
			category_label: t.category_label,
			priority: t.priority,
			due_date: t.due_date,
			status: t.status,
			score: t.score,
			trainer_feedback: t.trainer_feedback,
			created_at: t.created_at instanceof Date ? t.created_at : new Date(t.created_at)
		}));

		const aptScore = Number(student.aptitude_score) || 80;
		const vrbScore = Number(student.verbal_score) || 85;
		const logScore = Number(student.logical_score) || 78;

		const categorySummary = {
			aptitude: {
				score: aptScore,
				level: aptScore >= 80 ? 'Advanced' : aptScore >= 65 ? 'Intermediate' : 'Beginner',
				label: 'Quantitative Aptitude'
			},
			verbal: {
				score: vrbScore,
				level: vrbScore >= 80 ? 'Advanced' : vrbScore >= 65 ? 'Intermediate' : 'Beginner',
				label: 'Verbal Ability'
			},
			logical: {
				score: logScore,
				level: logScore >= 80 ? 'Advanced' : logScore >= 65 ? 'Intermediate' : 'Beginner',
				label: 'Logical Reasoning'
			}
		};

		return json({
			success: true,
			student: {
				id: student.id,
				user_id: student.user_id,
				name: student.name,
				email: student.email,
				register_number: student.register_number,
				department: student.department,
				course: student.course,
				year: student.year,
				batch: student.batch,
				phone: student.phone,
				cgpa: student.cgpa,
				aptitude_score: aptScore,
				verbal_score: vrbScore,
				logical_score: logScore,
				readiness_score: student.readiness_score,
				readiness_status: student.readiness_status,
				placement_status: student.placement_status,
				trainer_notes: student.trainer_notes
			},
			categorySummary,
			assessmentHistory,
			tasks: formattedTasks
		});
	} catch (err: any) {
		console.error('Error fetching student performance dossier:', err);
		return json({ error: 'Server Error', message: err.message }, { status: 500 });
	}
};
