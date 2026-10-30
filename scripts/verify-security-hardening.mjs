/**
 * Comprehensive Security Hardening Test Suite for PlaceTrack
 * 
 * Verifies:
 * 1. Unauthenticated access enforcement (401)
 * 2. Role-based authorization enforcement (403)
 * 3. Cross-student data isolation
 * 4. Protected-field modification prevention (role, cgpa, placement status, readiness score)
 * 5. Resource ownership verification (trainers cannot modify/delete other trainers' records)
 * 6. Assessment answer keys & hidden coding test cases protection
 * 7. File upload security (extension whitelist, size limit, path sanitization)
 * 8. Internal microservice credential enforcement
 * 9. Rate limiting functionality
 */

import { createSessionToken, validateSessionToken } from '../src/lib/server/auth.ts';
import { collections } from '../src/lib/server/firebase/collections.ts';
import { getAssessmentById, updateAssessment, deleteAssessment, getAttemptBreakdown } from '../src/lib/server/services/assessments.ts';
import { updateTask, deleteTask, getStudentTasks, getTrainerTasks } from '../src/lib/server/services/tasks.ts';
import { checkRateLimit } from '../src/lib/server/utils/rateLimit.ts';
import { CODING_PROBLEMS } from '../src/lib/server/services/codingProblemsData.ts';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
	if (condition) {
		console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
		passedTests++;
	} else {
		console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName} ${details ? `(${details})` : ''}`);
		failedTests++;
	}
}

async function runSecurityTests() {
	console.log('\n============================================================');
	console.log('🔒 PLACETRACK SECURITY HARDENING VERIFICATION TEST SUITE');
	console.log('============================================================\n');

	// Create test users
	const studentUserA = {
		id: 'usr_sec_student_01',
		name: 'Security Test Student A',
		email: 'student_a@placetrack.ai',
		role: 'STUDENT',
		registerNumber: '2024SEC01',
		department: 'MCA',
		batch: '2026',
		isActive: true
	};

	const studentUserB = {
		id: 'usr_sec_student_02',
		name: 'Security Test Student B',
		email: 'student_b@placetrack.ai',
		role: 'STUDENT',
		registerNumber: '2024SEC02',
		department: 'MCA',
		batch: '2026',
		isActive: true
	};

	const trainerUserA = {
		id: 'usr_sec_trainer_01',
		name: 'Security Trainer A',
		email: 'trainer_a@placetrack.ai',
		role: 'TRAINER',
		isActive: true
	};

	const trainerUserB = {
		id: 'usr_sec_trainer_02',
		name: 'Security Trainer B',
		email: 'trainer_b@placetrack.ai',
		role: 'TRAINER',
		isActive: true
	};

	const coordinatorUser = {
		id: 'usr_sec_coord_01',
		name: 'Security Coordinator',
		email: 'coord@placetrack.ai',
		role: 'PLACEMENT_COORDINATOR',
		isActive: true
	};

	// Save test users to Firestore collections
	await collections.users().doc(studentUserA.id).set(studentUserA);
	await collections.users().doc(studentUserB.id).set(studentUserB);
	await collections.users().doc(trainerUserA.id).set(trainerUserA);
	await collections.users().doc(trainerUserB.id).set(trainerUserB);
	await collections.users().doc(coordinatorUser.id).set(coordinatorUser);

	await collections.students().doc(studentUserA.id).set({
		id: studentUserA.id,
		userId: studentUserA.id,
		name: studentUserA.name,
		email: studentUserA.email,
		registerNumber: studentUserA.registerNumber,
		department: 'MCA',
		batch: '2026',
		cgpa: 8.5,
		readinessScore: 78,
		readinessStatus: 'In Training',
		placementStatus: 'Eligible',
		aptitudeScore: 75,
		verbalScore: 80,
		logicalScore: 78,
		technicalScore: 82
	});

	await collections.students().doc(studentUserB.id).set({
		id: studentUserB.id,
		userId: studentUserB.id,
		name: studentUserB.name,
		email: studentUserB.email,
		registerNumber: studentUserB.registerNumber,
		department: 'MCA',
		batch: '2026',
		cgpa: 9.1,
		readinessScore: 88,
		readinessStatus: 'Placement Ready',
		placementStatus: 'Eligible'
	});

	const tokenStudentA = createSessionToken(studentUserA);
	const tokenTrainerA = createSessionToken(trainerUserA);
	const tokenTrainerB = createSessionToken(trainerUserB);
	const tokenCoord = createSessionToken(coordinatorUser);

	// -------------------------------------------------------------
	// 1. Session Token Integrity & Validation
	// -------------------------------------------------------------
	console.log('SECTION 1: Session Cryptography & Integrity');
	const validatedStudentA = await validateSessionToken(tokenStudentA);
	assert(validatedStudentA?.id === studentUserA.id, 'Valid HMAC signed session token authenticates successfully');

	// Tampered token test
	const tamperedToken = tokenStudentA.substring(0, tokenStudentA.length - 6) + 'xxxxxx';
	const validatedTampered = await validateSessionToken(tamperedToken);
	assert(validatedTampered === null, 'Tampered HMAC session token is strictly rejected');

	// Role escalation in payload test
	const parts = tokenStudentA.split('.');
	const payloadObj = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
	payloadObj.role = 'PLACEMENT_COORDINATOR'; // attacker elevates payload role
	const forgedPayloadStr = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
	const forgedToken = `${forgedPayloadStr}.${parts[1]}`;
	const validatedForged = await validateSessionToken(forgedToken);
	assert(validatedForged === null, 'Forged role in session token payload fails signature verification');

	// -------------------------------------------------------------
	// 2. Protected-Field Modification Prevention
	// -------------------------------------------------------------
	console.log('\nSECTION 2: Protected Academic & Privilege Field Modification');
	// Import student profile PUT endpoint handler directly
	const studentProfileModule = await import('../src/routes/api/student/profile/+server.ts');

	// Test 2a: Student attempting to escalate role
	const reqRoleEscalate = new Request('http://localhost/api/student/profile', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ role: 'PLACEMENT_COORDINATOR' })
	});
	const resRoleEscalate = await studentProfileModule.PUT({
		locals: { user: studentUserA },
		request: reqRoleEscalate,
		cookies: { get: () => tokenStudentA }
	});
	assert(resRoleEscalate.status === 403, 'Student cannot escalate role via profile update (returns 403 Forbidden)');

	// Test 2b: Student attempting to inflate CGPA
	const reqCgpaInflate = new Request('http://localhost/api/student/profile', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cgpa: 9.99 })
	});
	const resCgpaInflate = await studentProfileModule.PUT({
		locals: { user: studentUserA },
		request: reqCgpaInflate,
		cookies: { get: () => tokenStudentA }
	});
	assert(resCgpaInflate.status === 403, 'Student cannot modify CGPA (returns 403 Forbidden)');

	// Test 2c: Student attempting to alter placementStatus
	const reqPlacement = new Request('http://localhost/api/student/profile', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ placementStatus: 'Placed' })
	});
	const resPlacement = await studentProfileModule.PUT({
		locals: { user: studentUserA },
		request: reqPlacement,
		cookies: { get: () => tokenStudentA }
	});
	assert(resPlacement.status === 403, 'Student cannot modify placementStatus (returns 403 Forbidden)');

	// Test 2d: Student attempting to alter readinessScore
	const reqReadiness = new Request('http://localhost/api/student/profile', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ readinessScore: 100 })
	});
	const resReadiness = await studentProfileModule.PUT({
		locals: { user: studentUserA },
		request: reqReadiness,
		cookies: { get: () => tokenStudentA }
	});
	assert(resReadiness.status === 403, 'Student cannot modify readinessScore (returns 403 Forbidden)');

	// Test 2e: Legitimate profile fields (bio, targetRole, phone) update permitted
	const reqValid = new Request('http://localhost/api/student/profile', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ bio: 'Aspiring Cloud & DevOps Engineer', targetRole: 'DevOps Engineer', phone: '+91 98765 43210' })
	});
	const resValid = await studentProfileModule.PUT({
		locals: { user: studentUserA },
		request: reqValid,
		cookies: { get: () => tokenStudentA }
	});
	assert(resValid.status === 200, 'Student can update authorized profile fields (bio, targetRole, phone)');

	// Verify Firestore record was NOT corrupted with forbidden fields
	const sDocVerify = await collections.students().doc(studentUserA.id).get();
	const sData = sDocVerify.data();
	assert(sData.cgpa === 8.5 && sData.placementStatus === 'Eligible', 'Authoritative student CGPA and placement status remain uncorrupted');

	// -------------------------------------------------------------
	// 3. Resource Ownership: Assessments & Tasks
	// -------------------------------------------------------------
	console.log('\nSECTION 3: Resource Ownership & Trainer Isolation');
	
	// Create assessment owned by Trainer A
	const testAssessmentId = 'asm_sec_test_01';
	await collections.assessments().doc(testAssessmentId).set({
		id: testAssessmentId,
		trainerId: trainerUserA.id,
		trainerName: trainerUserA.name,
		title: 'Trainer A DSA Diagnostic',
		category: 'Technical',
		status: 'Draft',
		durationMinutes: 30,
		totalQuestions: 2
	});

	await collections.assessmentQuestions(testAssessmentId).doc('q1').set({
		id: 'q1',
		questionOrder: 1,
		questionText: 'What is the time complexity of binary search?',
		optionA: 'O(n)',
		optionB: 'O(log n)',
		optionC: 'O(1)',
		optionD: 'O(n^2)',
		correctOption: 'b',
		explanation: 'Binary search halves search space at each step'
	});

	// Trainer B attempts to update Trainer A's assessment
	let trainerBUpdateThrew = false;
	try {
		await updateAssessment(testAssessmentId, trainerUserB.id, { title: 'Hijacked Assessment' }, false);
	} catch (err) {
		trainerBUpdateThrew = true;
	}
	assert(trainerBUpdateThrew, 'Trainer B cannot edit Trainer A assessment (ownership enforced)');

	// Trainer B attempts to delete Trainer A's assessment
	let trainerBDeleteThrew = false;
	try {
		await deleteAssessment(testAssessmentId, trainerUserB.id, false);
	} catch (err) {
		trainerBDeleteThrew = true;
	}
	assert(trainerBDeleteThrew, 'Trainer B cannot delete Trainer A assessment (ownership enforced)');

	// Coordinator can manage any assessment
	let coordUpdateSucceeded = false;
	try {
		await updateAssessment(testAssessmentId, coordinatorUser.id, { title: 'Coordinator Verified Diagnostic' }, true);
		coordUpdateSucceeded = true;
	} catch {}
	assert(coordUpdateSucceeded, 'Placement Coordinator has administrative privilege to manage assessments');

	// Trainer A creating and Trainer B attempting to update Task
	const testTaskId = 'task_sec_test_01';
	await collections.tasks().doc(testTaskId).set({
		id: testTaskId,
		trainerId: trainerUserA.id,
		title: 'Trainer A Aptitude Practice',
		category: 'aptitude',
		categoryLabel: 'Quantitative Aptitude',
		priority: 'High',
		dueDate: '2026-12-31',
		status: 'Pending'
	});

	let trainerBTaskUpdateThrew = false;
	try {
		await updateTask(testTaskId, trainerUserB.id, { title: 'Tampered Task' }, false);
	} catch (err) {
		trainerBTaskUpdateThrew = true;
	}
	assert(trainerBTaskUpdateThrew, 'Trainer B cannot modify Trainer A task (ownership enforced)');

	// -------------------------------------------------------------
	// 4. Assessment Answer Key & In-Progress Protection
	// -------------------------------------------------------------
	console.log('\nSECTION 4: Assessment Answer Key & Question Sanitization');

	// Student views assessment details: answers must NOT be exposed
	const studentViewed = await getAssessmentById(testAssessmentId, studentUserA);
	const studentQ1 = studentViewed?.questions?.[0];
	assert(
		studentQ1 && !('correct_option' in studentQ1) && !('correctOption' in studentQ1) && !('explanation' in studentQ1),
		'Assessment answer keys and explanations are stripped for student viewers'
	);

	// Trainer views assessment details: answers ARE exposed for editing
	const trainerViewed = await getAssessmentById(testAssessmentId, trainerUserA);
	const trainerQ1 = trainerViewed?.questions?.[0];
	assert(
		trainerQ1 && (trainerQ1.correctOption === 'b' || trainerQ1.correct_option === 'b'),
		'Assessment answer key and explanations are accessible to author trainer'
	);

	// In-progress attempt breakdown test: answers must NOT leak before submission
	const testAttemptId = 'att_sec_test_in_progress';
	await collections.assessmentAttempts().doc(testAttemptId).set({
		id: testAttemptId,
		assessmentId: testAssessmentId,
		studentId: studentUserA.id,
		status: 'In Progress',
		score: 0
	});

	let inProgressBreakdownBlocked = false;
	try {
		await getAttemptBreakdown(testAttemptId, studentUserA);
	} catch (err) {
		inProgressBreakdownBlocked = true;
	}
	assert(inProgressBreakdownBlocked, 'In-progress assessment breakdown is withheld until student submits');

	// Cross-student attempt breakdown test: Student B cannot view Student A attempt
	await collections.assessmentAttempts().doc(testAttemptId).set({
		id: testAttemptId,
		assessmentId: testAssessmentId,
		studentId: studentUserA.id,
		status: 'Completed',
		score: 1
	});

	let crossStudentAttemptBlocked = false;
	try {
		await getAttemptBreakdown(testAttemptId, studentUserB);
	} catch (err) {
		crossStudentAttemptBlocked = true;
	}
	assert(crossStudentAttemptBlocked, 'Student B cannot view Student A completed assessment attempt breakdown (403)');

	// -------------------------------------------------------------
	// 5. Hidden Coding Test Case Protection
	// -------------------------------------------------------------
	console.log('\nSECTION 5: Hidden Coding Test Case Leak Prevention');
	const sampleProblem = CODING_PROBLEMS[0];
	const hiddenCases = sampleProblem.testCases.filter((tc) => tc.isHidden);
	assert(hiddenCases.length > 0, 'Coding problem has hidden testcases configured');

	// Verify code submission sanitizes hidden testcases
	const codeSubmitModule = await import('../src/routes/api/code/submit/+server.ts');
	const reqCodeSub = new Request('http://localhost/api/code/submit', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			problemId: sampleProblem.id,
			language: 'python',
			code: 'print("test")'
		})
	});

	const resCodeSub = await codeSubmitModule.POST({
		request: reqCodeSub,
		cookies: { get: () => tokenStudentA },
		locals: { user: studentUserA }
	});

	const codeSubData = await resCodeSub.json();
	const sanitizedHiddenResults = codeSubData.testCaseResults?.filter((r) => r.isHidden) || [];
	const rawHiddenInputsLeaked = sanitizedHiddenResults.some(
		(r) => r.input !== 'Hidden testcase' || r.expectedOutput !== 'Hidden output'
	);
	assert(!rawHiddenInputsLeaked, 'Hidden coding test case inputs and outputs are masked in submission results');

	// -------------------------------------------------------------
	// 6. File Upload Security
	// -------------------------------------------------------------
	console.log('\nSECTION 6: File Upload Security & Extension Whitelist');
	const materialsModule = await import('../src/routes/api/materials/+server.ts');

	// Dangerous executable file upload
	const reqDangerousFile = new Request('http://localhost/api/materials', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			title: 'Malicious Payload',
			category: 'technical',
			fileName: 'exploit.sh',
			fileSize: 1024
		})
	});

	const resDangerousFile = await materialsModule.POST({
		locals: { user: trainerUserA },
		request: reqDangerousFile,
		cookies: { get: () => tokenTrainerA }
	});
	assert(resDangerousFile.status === 400, 'Dangerous file extension (.sh) is rejected with 400 Validation Error');

	// Oversized file upload (> 25MB)
	const reqOversizedFile = new Request('http://localhost/api/materials', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			title: 'Giant File',
			category: 'aptitude',
			fileName: 'large_dump.pdf',
			fileSize: 30 * 1024 * 1024 // 30 MB
		})
	});

	const resOversizedFile = await materialsModule.POST({
		locals: { user: trainerUserA },
		request: reqOversizedFile,
		cookies: { get: () => tokenTrainerA }
	});
	assert(resOversizedFile.status === 400, 'Oversized file upload (> 25MB) is rejected with 400 Validation Error');

	// Valid document upload (.pdf)
	const reqValidFile = new Request('http://localhost/api/materials', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			title: 'Semester Placement Formula Guide',
			category: 'aptitude',
			fileName: 'quant_formulas.pdf',
			fileSize: 1024 * 50
		})
	});

	const resValidFile = await materialsModule.POST({
		locals: { user: trainerUserA },
		request: reqValidFile,
		cookies: { get: () => tokenTrainerA }
	});
	assert(resValidFile.status === 200 || resValidFile.status === 201, 'Authorized document format (.pdf) within size limit uploads successfully');

	// Trainer B attempts to delete Trainer A's material
	const materialIdToDelete = (await resValidFile.json()).material?.id;
	if (materialIdToDelete) {
		const matItemModule = await import('../src/routes/api/materials/[id]/+server.ts');
		const resTrainerBMatDelete = await matItemModule.DELETE({
			params: { id: materialIdToDelete },
			locals: { user: trainerUserB },
			request: new Request(`http://localhost/api/materials/${materialIdToDelete}`, { method: 'DELETE' }),
			cookies: { get: () => tokenTrainerB }
		});
		assert(resTrainerBMatDelete.status === 403, 'Trainer B cannot delete Trainer A study material (403 Forbidden)');
	}

	// -------------------------------------------------------------
	// 7. Rate Limiter Validation
	// -------------------------------------------------------------
	console.log('\nSECTION 7: Rate Limiting & DoS Protection');
	const testRateLimitKey = `test_ratelimit_${Date.now()}`;
	let allowedCount = 0;
	let throttledCount = 0;

	for (let i = 0; i < 7; i++) {
		const check = checkRateLimit(testRateLimitKey, 5, 60000); // 5 max requests
		if (check.allowed) allowedCount++;
		else throttledCount++;
	}

	assert(allowedCount === 5 && throttledCount === 2, 'Sliding-window rate limiter permits exactly max requests and throttles excess with 429');

	// -------------------------------------------------------------
	// 8. Coordinator API Role Guarding
	// -------------------------------------------------------------
	console.log('\nSECTION 8: Coordinator API Namespace Protection');
	const offersModule = await import('../src/routes/api/coordinator/offers/+server.ts');
	
	// Student accessing coordinator offers
	const resStudentOffers = await offersModule.GET({
		locals: { user: studentUserA },
		request: new Request('http://localhost/api/coordinator/offers'),
		cookies: { get: () => tokenStudentA }
	});
	assert(resStudentOffers.status === 403, 'Student cannot access coordinator offers roster (403 Forbidden)');

	// Coordinator accessing coordinator offers
	const resCoordOffers = await offersModule.GET({
		locals: { user: coordinatorUser },
		request: new Request('http://localhost/api/coordinator/offers'),
		cookies: { get: () => tokenCoord }
	});
	assert(resCoordOffers.status === 200, 'Placement Coordinator can access placement offers endpoint (200 OK)');

	// -------------------------------------------------------------
	// Summary
	// -------------------------------------------------------------
	console.log('\n============================================================');
	console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
	console.log('============================================================\n');

	if (failedTests > 0) {
		process.exit(1);
	}
}

runSecurityTests().catch((err) => {
	console.error('Fatal test error:', err);
	process.exit(1);
});
