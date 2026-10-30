import { collections } from '../src/lib/server/firebase/collections.ts';
import { Timestamp } from 'firebase-admin/firestore';
import { findUserByIdentifier, findUserById } from '../src/lib/server/auth.ts';
import { getTrainerAssessments, getStudentAssignedAssessments, getAssessmentById, createAssessment, startAssessmentAttempt, submitAssessmentAttempt } from '../src/lib/server/services/assessments.ts';
import { getTrainerTasks, getStudentTasks, createTask } from '../src/lib/server/services/tasks.ts';
import { getPlacementDrives, getCoordinatorStudents, getCompanies, getAllApplications, getPlacementOffers, createPlacementDrive } from '../src/lib/server/services/coordinator.ts';
import { getStudentDashboardData } from '../src/lib/server/services/studentDashboard.ts';
import { getCoordinatorAnalytics } from '../src/lib/server/services/analytics.ts';

async function seedTestData() {
	const now = Timestamp.now();
	const studentUid = 'usr_student_01';
	const trainerUid = 'usr_trainer_01';

	// Users & Students
	await collections.users().doc(studentUid).set({
		uid: studentUid,
		name: 'Alex Morgan',
		email: 'student@placetrack.ai',
		role: 'STUDENT',
		registerNumber: '2024MCA1042',
		department: 'Master of Computer Applications (MCA)',
		batch: '2026',
		isActive: true,
		createdAt: now,
		updatedAt: now
	});

	await collections.students().doc(studentUid).set({
		userId: studentUid,
		name: 'Alex Morgan',
		email: 'student@placetrack.ai',
		registerNumber: '2024MCA1042',
		department: 'Master of Computer Applications (MCA)',
		course: 'MCA',
		year: 2,
		batch: '2026',
		phone: '+91 98765 43210',
		cgpa: 8.85,
		readinessScore: 82,
		readinessStatus: 'Placement Ready',
		placementStatus: 'Eligible',
		aptitudeScore: 85,
		verbalScore: 80,
		logicalScore: 82,
		technicalScore: 80,
		testsCompleted: 4,
		attendanceRate: '96%',
		trainerNotes: 'Consistent problem solving and strong coding fundamentals.',
		targetRole: 'Software Development Engineer',
		targetCtc: '14 - 18 LPA',
		createdAt: now,
		updatedAt: now
	});

	await collections.users().doc(trainerUid).set({
		uid: trainerUid,
		name: 'Prof. David Chen',
		email: 'trainer@placetrack.ai',
		role: 'TRAINER',
		department: 'Master of Computer Applications (MCA)',
		isActive: true,
		createdAt: now,
		updatedAt: now
	});

	// Companies & Placement Drives
	await collections.companies().doc('cmp_1').set({
		id: 'cmp_1',
		name: 'TechCorp Systems',
		industry: 'Enterprise Software & Cloud',
		tier: 'Tier-1',
		website: 'https://techcorp.example.com',
		location: 'Bangalore, India',
		contactEmail: 'careers@techcorp.example.com',
		contactPhone: '+91 80 4000 1234',
		isActive: true,
		createdAt: now,
		updatedAt: now
	});

	await collections.placementDrives().doc('drv_1').set({
		id: 'drv_1',
		companyId: 'cmp_1',
		companyName: 'TechCorp Systems',
		title: 'TechCorp SDE Campus Drive 2026',
		role: 'Software Development Engineer',
		ctcDisplay: '12 - 16 LPA',
		ctcMin: 12.0,
		ctcMax: 16.0,
		driveDate: '2026-11-20',
		applicationOpeningDate: '2026-10-01',
		applicationDeadline: '2026-11-15',
		status: 'Active',
		eligibleCount: 45,
		minCgpa: 7.5,
		minReadiness: 70,
		targetDepartments: ['Master of Computer Applications (MCA)'],
		targetBatches: ['2026'],
		description: 'Annual campus hiring drive for core engineering teams.',
		skills: ['Python', 'DSA', 'SQL'],
		createdAt: now,
		updatedAt: now
	});

	// Applications & Offers
	await collections.applications().doc('app_1').set({
		id: 'app_1',
		driveId: 'drv_1',
		studentId: studentUid,
		studentName: 'Alex Morgan',
		studentReg: '2024MCA1042',
		department: 'Master of Computer Applications (MCA)',
		companyId: 'cmp_1',
		companyName: 'TechCorp Systems',
		role: 'Software Development Engineer',
		status: 'Shortlisted',
		appliedAt: now,
		updatedAt: now
	});

	await collections.placementOffers().doc('ofr_1').set({
		id: 'ofr_1',
		studentId: studentUid,
		studentName: 'Alex Morgan',
		studentReg: '2024MCA1042',
		department: 'Master of Computer Applications (MCA)',
		companyId: 'cmp_1',
		companyName: 'TechCorp Systems',
		role: 'Software Development Engineer',
		ctcOffered: 14.5,
		offerDate: '2026-10-15',
		status: 'Accepted',
		createdAt: now
	});

	// Tasks
	await collections.tasks().doc('tsk_1').set({
		id: 'tsk_1',
		trainerId: trainerUid,
		trainerName: 'Prof. David Chen',
		trainerEmail: 'trainer@placetrack.ai',
		studentId: studentUid,
		studentName: 'Alex Morgan',
		targetBatch: '2026',
		title: 'Complete Dynamic Programming Drill',
		description: 'Solve Knapsack and Longest Common Subsequence problems.',
		category: 'technical',
		categoryLabel: 'Technical DSA',
		priority: 'High',
		dueDate: 'Tomorrow, 11:59 PM',
		dueStatus: 'upcoming',
		status: 'Pending',
		targetModuleUrl: '/student/coding',
		createdAt: now,
		updatedAt: now
	});

	// Assessments & Questions
	const asmId = 'asm_test_01';
	await collections.assessments().doc(asmId).set({
		id: asmId,
		trainerId: trainerUid,
		trainerName: 'Prof. David Chen',
		title: 'Core Technical DSA Diagnostic',
		category: 'Technical',
		description: 'Evaluation of array manipulation and time complexity concepts.',
		difficultyLevel: 'Intermediate',
		durationMinutes: 30,
		totalQuestions: 2,
		targetType: 'all',
		targetBatch: 'All',
		targetStudentIds: [],
		status: 'Published',
		createdAt: now,
		updatedAt: now
	});

	await collections.assessmentQuestions(asmId).doc('q_1').set({
		id: 'q_1',
		questionOrder: 1,
		questionText: 'What is the time complexity of searching in a balanced Binary Search Tree?',
		optionA: 'O(1)',
		optionB: 'O(log N)',
		optionC: 'O(N)',
		optionD: 'O(N log N)',
		correctOption: 'b',
		explanation: 'Balanced BST search halves the remaining search space at each step.',
		createdAt: now
	});

	await collections.assessmentQuestions(asmId).doc('q_2').set({
		id: 'q_2',
		questionOrder: 2,
		questionText: 'Which data structure follows the First-In-First-Out (FIFO) principle?',
		optionA: 'Stack',
		optionB: 'Queue',
		optionC: 'Priority Queue',
		optionD: 'Binary Heap',
		correctOption: 'b',
		explanation: 'Queues process items in FIFO order.',
		createdAt: now
	});
}

async function testMigration() {
	console.log('========================================================');
	console.log('🧪 VERIFYING FIRESTORE DATA LAYER MIGRATION');
	console.log('========================================================\n');

	await seedTestData();
	console.log('🌱 Seeded test fixtures into Firestore collections.\n');

	let passed = 0;
	let failed = 0;

	async function check(name, fn) {
		try {
			await fn();
			console.log(`  ✅ [PASS] ${name}`);
			passed++;
		} catch (err) {
			console.error(`  ❌ [FAIL] ${name}:`, err.message);
			failed++;
		}
	}

	// 1. Auth & Users
	await check('Auth - findUserByIdentifier (Student)', async () => {
		const u = await findUserByIdentifier('student@placetrack.ai');
		if (!u || u.role !== 'STUDENT') throw new Error(`Unexpected user: ${JSON.stringify(u)}`);
	});

	await check('Auth - findUserByIdentifier (Trainer)', async () => {
		const u = await findUserByIdentifier('trainer@placetrack.ai');
		if (!u || u.role !== 'TRAINER') throw new Error(`Unexpected user: ${JSON.stringify(u)}`);
	});

	// 2. Assessments
	await check('Assessments - getTrainerAssessments', async () => {
		const list = await getTrainerAssessments('usr_trainer_01', true);
		if (!Array.isArray(list) || list.length === 0) throw new Error('Expected at least 1 assessment');
	});

	await check('Assessments - getStudentAssignedAssessments', async () => {
		const list = await getStudentAssignedAssessments('usr_student_01');
		if (!Array.isArray(list) || list.length === 0) throw new Error('Expected at least 1 assigned assessment');
	});

	await check('Assessments - getAssessmentById (Trainer/Student sanitized)', async () => {
		const asmId = 'asm_test_01';
		const studentView = await getAssessmentById(asmId, { id: 'usr_student_01', role: 'STUDENT' });
		if (!studentView || !studentView.questions || studentView.questions.length === 0) {
			throw new Error('Could not load student view');
		}
		if (studentView.questions[0].correct_option) {
			throw new Error('Security leak: student view contains correct_option');
		}

		const trainerView = await getAssessmentById(asmId, { id: 'usr_trainer_01', role: 'TRAINER' });
		if (!trainerView || !trainerView.questions[0].correct_option) {
			throw new Error('Trainer view missing correct_option');
		}
	});

	await check('Assessments - Attempt & Submit Lifecycle', async () => {
		const asmId = 'asm_test_01';
		const startRes = await startAssessmentAttempt(asmId, 'usr_student_01');
		if (!startRes || !startRes.attemptId) throw new Error('Could not start attempt');

		const submitRes = await submitAssessmentAttempt(asmId, startRes.attemptId, 'usr_student_01', {
			'q_1': 'b',
			'q_2': 'b'
		}, 60);

		if (submitRes.score !== 2 || submitRes.percentage !== 100) {
			throw new Error(`Unexpected grading result: score=${submitRes.score}, percentage=${submitRes.percentage}`);
		}
	});

	// 3. Tasks
	await check('Tasks - getTrainerTasks', async () => {
		const tasks = await getTrainerTasks('usr_trainer_01', true);
		if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('Expected at least 1 trainer task');
	});

	await check('Tasks - getStudentTasks', async () => {
		const tasks = await getStudentTasks('usr_student_01');
		if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('Expected at least 1 student task');
	});

	// 4. Coordinator Services
	await check('Coordinator - getPlacementDrives', async () => {
		const drives = await getPlacementDrives();
		if (!Array.isArray(drives) || drives.length === 0) throw new Error('Expected drives');
	});

	await check('Coordinator - getCoordinatorStudents', async () => {
		const students = await getCoordinatorStudents();
		if (!Array.isArray(students) || students.length === 0) throw new Error('Expected students roster');
	});

	await check('Coordinator - getCompanies', async () => {
		const comps = await getCompanies();
		if (!Array.isArray(comps) || comps.length === 0) throw new Error('Expected companies');
	});

	await check('Coordinator - getAllApplications & getPlacementOffers', async () => {
		const apps = await getAllApplications();
		const offers = await getPlacementOffers();
		if (!Array.isArray(apps) || !Array.isArray(offers)) throw new Error('Expected apps and offers arrays');
	});

	// 5. Student Dashboard
	await check('Student Dashboard - getStudentDashboardData (Eligibility Filtered)', async () => {
		const data = await getStudentDashboardData('usr_student_01');
		if (!data || !data.overview || !data.skills) throw new Error('Missing dashboard sections');
		if (!data.placementDrives || data.placementDrives.length === 0) throw new Error('Missing eligible placement drives for student');
		const drive = data.placementDrives[0];
		if (!drive.isEligible && !drive.hasApplied) throw new Error('Student received ineligible placement drive');
	});

	// 6. Analytics
	await check('Analytics - getCoordinatorAnalytics', async () => {
		const analytics = await getCoordinatorAnalytics();
		if (!analytics || !analytics.overview) throw new Error('Missing analytics overview');
		console.log(`     Analytics source: ${analytics.source}, Total Students: ${analytics.overview.totalStudents}`);
	});

	console.log('\n========================================================');
	console.log(`Summary: ${passed} passed, ${failed} failed`);
	console.log('========================================================\n');

	if (failed > 0) {
		process.exit(1);
	}
}

testMigration();
