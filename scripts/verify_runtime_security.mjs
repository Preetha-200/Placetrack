import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function request(endpoint, options = {}) {
	const url = `${BASE_URL}${endpoint}`;
	const headers = { ...(options.headers || {}) };

	let body = options.body;
	if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Buffer)) {
		headers['Content-Type'] = 'application/json';
		body = JSON.stringify(body);
	}

	const res = await fetch(url, {
		method: options.method || 'GET',
		headers,
		body,
		redirect: options.redirect || 'manual'
	});

	const text = await res.text();
	let json = null;
	try {
		json = JSON.parse(text);
	} catch {}

	const cookieHeader = res.headers.get('set-cookie');
	let sessionCookie = null;
	if (cookieHeader) {
		const match = cookieHeader.match(/placetrack_session=([^;]+)/);
		if (match) sessionCookie = match[1];
	}

	return {
		status: res.status,
		headers: res.headers,
		text,
		json,
		sessionCookie,
		location: res.headers.get('location')
	};
}

async function runSecuritySuite() {
	console.log('================================================================');
	console.log('🛡️  PLACETRACK RUNTIME SECURITY & RBAC AUDIT SUITE');
	console.log('================================================================');
	console.log(`Target Environment: ${BASE_URL}\n`);

	let passed = 0;
	let failed = 0;
	const failures = [];

	function assert(testId, desc, condition, detail = '') {
		if (condition) {
			console.log(`  ✅ [${testId}] PASS: ${desc}`);
			passed++;
		} else {
			const msg = `[${testId}] FAIL: ${desc} ${detail ? `| Detail: ${detail}` : ''}`;
			console.error(`  ❌ ${msg}`);
			failed++;
			failures.push(msg);
		}
	}

	// ============================================================================
	// SUITE 1: AUTHENTICATION & SESSION LIFECYCLE
	// ============================================================================
	console.log('\n--- SUITE 1: Authentication & Role Verification ---');

	// 1.1 Student Login
	const studentRes = await request('/api/auth/login', {
		method: 'POST',
		body: { username: 'student@placetrack.ai', password: 'password123', role: 'student' }
	});
	assert('AUTH-01', 'Student credentials authenticate successfully (200 OK)', studentRes.status === 200, `Status: ${studentRes.status}`);
	assert('AUTH-02', 'Student login returns role STUDENT in safe user payload', studentRes.json?.user?.role === 'STUDENT', JSON.stringify(studentRes.json?.user));
	assert('AUTH-03', 'Student login response sets HTTP session cookie', !!studentRes.sessionCookie);
	assert('AUTH-04', 'Student login response omits passwordHash', studentRes.json?.user?.passwordHash === undefined);
	const studentCookie = studentRes.sessionCookie;

	// 1.2 Trainer Login
	const trainerRes = await request('/api/auth/login', {
		method: 'POST',
		body: { username: 'trainer@placetrack.ai', password: 'password123', role: 'trainer' }
	});
	assert('AUTH-05', 'Trainer credentials authenticate successfully (200 OK)', trainerRes.status === 200, `Status: ${trainerRes.status}`);
	assert('AUTH-06', 'Trainer login returns role TRAINER', trainerRes.json?.user?.role === 'TRAINER', JSON.stringify(trainerRes.json?.user));
	assert('AUTH-07', 'Trainer login response sets HTTP session cookie', !!trainerRes.sessionCookie);
	const trainerCookie = trainerRes.sessionCookie;

	// 1.3 Coordinator Login
	const coordRes = await request('/api/auth/login', {
		method: 'POST',
		body: { username: 'coordinator@placetrack.ai', password: 'password123', role: 'coordinator' }
	});
	assert('AUTH-08', 'Coordinator credentials authenticate successfully (200 OK)', coordRes.status === 200, `Status: ${coordRes.status}`);
	assert('AUTH-09', 'Coordinator login returns role PLACEMENT_COORDINATOR', coordRes.json?.user?.role === 'PLACEMENT_COORDINATOR', JSON.stringify(coordRes.json?.user));
	assert('AUTH-10', 'Coordinator login response sets HTTP session cookie', !!coordRes.sessionCookie);
	const coordCookie = coordRes.sessionCookie;

	// 1.4 Invalid password
	const badLogin = await request('/api/auth/login', {
		method: 'POST',
		body: { username: 'student@placetrack.ai', password: 'WrongPassword999!', role: 'student' }
	});
	assert('AUTH-11', 'Incorrect password rejected with 401 Unauthorized', badLogin.status === 401, `Status: ${badLogin.status}`);

	// 1.5 Missing credentials
	const emptyLogin = await request('/api/auth/login', {
		method: 'POST',
		body: { username: '', password: '' }
	});
	assert('AUTH-12', 'Empty credentials rejected with 400 Bad Request', emptyLogin.status === 400, `Status: ${emptyLogin.status}`);

	// ============================================================================
	// SUITE 2: TOKEN INTEGRITY, SIGNATURE VERIFICATION & EXPIRATION
	// ============================================================================
	console.log('\n--- SUITE 2: Token Integrity & Forgery Protection ---');

	// 2.1 Forged Token: Tampered signature
	const forgedToken = `${studentCookie}.tampered_signature_xyz`;
	const forgedRes = await request('/api/auth/me', {
		headers: { Cookie: `placetrack_session=${forgedToken}` }
	});
	assert('TOK-01', 'Session token with tampered signature is rejected (401)', forgedRes.status === 401, `Status: ${forgedRes.status}`);

	// 2.2 Forged Token: Manually crafted base64 with elevated role PLACEMENT_COORDINATOR
	const fakePayload = Buffer.from(JSON.stringify({
		userId: studentRes.json?.user?.id,
		role: 'PLACEMENT_COORDINATOR',
		exp: Date.now() + 86400000
	})).toString('base64url');
	const unsignedToken = `${fakePayload}.invalidsignature123`;
	const elevatedRes = await request('/api/coordinator/companies', {
		headers: { Cookie: `placetrack_session=${unsignedToken}` }
	});
	assert('TOK-02', 'Forged elevated token rejected by coordinator endpoint (401)', elevatedRes.status === 401, `Status: ${elevatedRes.status}`);

	// 2.3 Expired Token: exp in the past with invalid signature
	const expiredPayload = Buffer.from(JSON.stringify({
		userId: studentRes.json?.user?.id,
		role: 'STUDENT',
		exp: Date.now() - 3600000 // 1 hour ago
	})).toString('base64url');
	const expiredRes = await request('/api/auth/me', {
		headers: { Cookie: `placetrack_session=${expiredPayload}.fakesig` }
	});
	assert('TOK-03', 'Expired/Unverified token rejected (401)', expiredRes.status === 401, `Status: ${expiredRes.status}`);

	// 2.4 Arbitrary garbage token
	const garbageRes = await request('/api/auth/me', {
		headers: { Cookie: 'placetrack_session=malformed_token_not_json' }
	});
	assert('TOK-04', 'Malformed garbage token rejected (401)', garbageRes.status === 401, `Status: ${garbageRes.status}`);

	// 2.5 Bearer Header Authentication Support
	const bearerRes = await request('/api/auth/me', {
		headers: { Authorization: `Bearer ${studentCookie}` }
	});
	assert('TOK-05', 'Valid token in Authorization: Bearer header accepted (200)', bearerRes.status === 200, `Status: ${bearerRes.status}`);

	// 2.6 Malformed Bearer Header
	const badBearerRes = await request('/api/auth/me', {
		headers: { Authorization: 'Bearer fake.invalid.token' }
	});
	assert('TOK-06', 'Invalid token in Authorization: Bearer header rejected (401)', badBearerRes.status === 401, `Status: ${badBearerRes.status}`);

	// ============================================================================
	// SUITE 3: ROLE-BASED ACCESS CONTROL (DIRECT RESTRICTED ENDPOINTS)
	// ============================================================================
	console.log('\n--- SUITE 3: Direct Restricted Endpoint Access Control ---');

	// 3.1 Student attempting to access Coordinator endpoints
	const sCompanyCreate = await request('/api/coordinator/companies', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: { name: 'Hacker Corp', industry: 'Security' }
	});
	assert('RBAC-01', 'Student blocked from creating companies (403 Forbidden)', sCompanyCreate.status === 403, `Got ${sCompanyCreate.status}`);

	const sDriveCreate = await request('/api/coordinator/drives', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: { companyName: 'Hacker Corp', role: 'Security Tester', driveDate: '2026-11-01' }
	});
	assert('RBAC-02', 'Student blocked from creating recruitment drives (403 Forbidden)', sDriveCreate.status === 403, `Got ${sDriveCreate.status}`);

	const sOfferCreate = await request('/api/coordinator/offers', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: { studentName: 'Alex Morgan', companyName: 'Hacker Corp', role: 'Chief Security Officer', ctcOffered: 50 }
	});
	assert('RBAC-03', 'Student blocked from issuing placement offers (403 Forbidden)', sOfferCreate.status === 403, `Got ${sOfferCreate.status}`);

	// 3.2 Student attempting to access Trainer endpoints
	const sAssessmentCreate = await request('/api/assessments', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: { title: 'Fake Assessment', category: 'Aptitude', questions: [{ questionText: 'Q1', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', correctOption: 'a' }] }
	});
	assert('RBAC-04', 'Student blocked from creating assessments (403 Forbidden)', sAssessmentCreate.status === 403, `Got ${sAssessmentCreate.status}`);

	const sTaskCreate = await request('/api/tasks', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: { title: 'Fake Task', description: 'Fake Desc', category: 'aptitude' }
	});
	assert('RBAC-05', 'Student blocked from creating trainer tasks (403 Forbidden)', sTaskCreate.status === 403, `Got ${sTaskCreate.status}`);

	// 3.3 Trainer attempting to access Coordinator endpoints
	const tCompanyCreate = await request('/api/coordinator/companies', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${trainerCookie}` },
		body: { name: 'Trainer Unauthorized Corp', industry: 'EdTech' }
	});
	assert('RBAC-06', 'Trainer blocked from creating companies (403 Forbidden)', tCompanyCreate.status === 403, `Got ${tCompanyCreate.status}`);

	const tDriveCreate = await request('/api/coordinator/drives', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${trainerCookie}` },
		body: { companyName: 'Trainer Corp', role: 'Instructor', driveDate: '2026-11-01' }
	});
	assert('RBAC-07', 'Trainer blocked from creating placement drives (403 Forbidden)', tDriveCreate.status === 403, `Got ${tDriveCreate.status}`);

	const tOfferCreate = await request('/api/coordinator/offers', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${trainerCookie}` },
		body: { studentName: 'Alex Morgan', companyName: 'Trainer Corp', role: 'Trainer Associate', ctcOffered: 15 }
	});
	assert('RBAC-08', 'Trainer blocked from recording placement offers (403 Forbidden)', tOfferCreate.status === 403, `Got ${tOfferCreate.status}`);

	// 3.4 Unauthenticated access to restricted endpoints
	const anonDrives = await request('/api/coordinator/drives', { method: 'POST', body: { title: 'Anon Drive' } });
	assert('RBAC-09', 'Unauthenticated user blocked from coordinator drives (401 Unauthorized)', anonDrives.status === 401, `Got ${anonDrives.status}`);

	const anonAssessments = await request('/api/assessments', { method: 'POST', body: { title: 'Anon Assessment' } });
	assert('RBAC-10', 'Unauthenticated user blocked from creating assessments (401 Unauthorized)', anonAssessments.status === 401, `Got ${anonAssessments.status}`);

	// 3.5 Coordinator authorized actions
	const cDrivesGet = await request('/api/coordinator/drives', {
		headers: { Cookie: `placetrack_session=${coordCookie}` }
	});
	assert('RBAC-11', 'Coordinator authorized to fetch drives (200 OK)', cDrivesGet.status === 200, `Got ${cDrivesGet.status}`);

	const cCompaniesGet = await request('/api/coordinator/companies', {
		headers: { Cookie: `placetrack_session=${coordCookie}` }
	});
	assert('RBAC-12', 'Coordinator authorized to fetch companies (200 OK)', cCompaniesGet.status === 200, `Got ${cCompaniesGet.status}`);

	const cOffersGet = await request('/api/coordinator/offers', {
		headers: { Cookie: `placetrack_session=${coordCookie}` }
	});
	assert('RBAC-13', 'Coordinator authorized to fetch offers (200 OK)', cOffersGet.status === 200, `Got ${cOffersGet.status}`);

	const cAnalyticsGet = await request('/api/coordinator/analytics', {
		headers: { Cookie: `placetrack_session=${coordCookie}` }
	});
	assert('RBAC-14', 'Coordinator authorized to fetch analytics (200 OK)', cAnalyticsGet.status === 200, `Got ${cAnalyticsGet.status}`);

	// ============================================================================
	// SUITE 4: DATA ISOLATION & HORIZONTAL PRIVILEGE ESCALATION
	// ============================================================================
	console.log('\n--- SUITE 4: Cross-Student ID Spoofing & Isolation ---');

	// 4.1 Student attempting to predict readiness for a DIFFERENT student by ID
	const victimStudentId = '80c27269-dec9-49b4-aa60-29efec68e0c8'; // Ananya Iyer
	const sSpoofPred = await request('/api/ai/predict-readiness', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: { studentId: victimStudentId }
	});
	assert('ID-01', 'Student predicting readiness with another student ID returns 200 OK', sSpoofPred.status === 200, `Got ${sSpoofPred.status}`);
	assert(
		'ID-02',
		'Server enforces student own ID, ignoring victim ID',
		sSpoofPred.json?.prediction?.studentId !== victimStudentId && sSpoofPred.json?.prediction?.studentName === 'Alex Morgan',
		`Expected Alex Morgan, got: ${sSpoofPred.json?.prediction?.studentName}`
	);

	// 4.2 Student attempting to query another student prediction via GET ?studentId=...
	const sSpoofGet = await request(`/api/ai/predict-readiness?studentId=${victimStudentId}`, {
		headers: { Cookie: `placetrack_session=${studentCookie}` }
	});
	assert('ID-03', 'Student GET predict-readiness with victim studentId returns 200 OK', sSpoofGet.status === 200);
	assert(
		'ID-04',
		'Server overrides student GET query param to only return their own prediction',
		sSpoofGet.json?.prediction?.studentId !== victimStudentId,
		`Returned studentId: ${sSpoofGet.json?.prediction?.studentId}`
	);

	// 4.3 Student attempting to modify role or official scores via PUT /api/student/profile
	const sTamperProfile = await request('/api/student/profile', {
		method: 'PUT',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: {
			role: 'PLACEMENT_COORDINATOR',
			readiness_score: 99,
			placement_status: 'Placed',
			aptitude_score: 100,
			bio: 'Legitimate bio update'
		}
	});
	assert('ID-05', 'Student profile update returns 200 OK', sTamperProfile.status === 200);

	// Verify that role and official scores were NOT tampered
	const sVerifyProfile = await request('/api/student/profile', {
		headers: { Cookie: `placetrack_session=${studentCookie}` }
	});
	assert('ID-06', 'Student role cannot be modified by user (remains STUDENT)', sVerifyProfile.json?.student?.role !== 'PLACEMENT_COORDINATOR');
	assert('ID-07', 'Student official readiness score was not overwritten to 99', sVerifyProfile.json?.student?.readiness_score !== 99);

	// ============================================================================
	// SUITE 5: ASSESSMENT ANSWER KEY & HIDDEN TEST-CASE PROTECTION
	// ============================================================================
	console.log('\n--- SUITE 5: Answer Key & Test Case Protection ---');

	// 5.1 Fetch assessments list as Trainer to obtain an assessment ID
	const tAssessments = await request('/api/assessments', {
		headers: { Cookie: `placetrack_session=${trainerCookie}` }
	});
	assert('PROT-01', 'Trainer can fetch assessments (200 OK)', tAssessments.status === 200);
	const sampleAssessment = tAssessments.json?.assessments?.[0];
	const sampleAsmId = sampleAssessment?.id;

	if (sampleAsmId) {
		// Fetch as Student
		const sAsmView = await request(`/api/assessments/${sampleAsmId}`, {
			headers: { Cookie: `placetrack_session=${studentCookie}` }
		});
		assert('PROT-02', 'Student can fetch assessment details (200 OK)', sAsmView.status === 200);
		const studentQuestions = sAsmView.json?.assessment?.questions || [];
		assert('PROT-03', 'Assessment contains questions', studentQuestions.length > 0);

		// Verify every question delivered to student has correct_option and explanation STRIPPED
		const leakedOptions = studentQuestions.filter((q) => q.correct_option !== undefined || q.correctOption !== undefined);
		const leakedExpl = studentQuestions.filter((q) => q.explanation !== undefined);
		assert('PROT-04', 'Zero questions leak correct_option to Student before submission', leakedOptions.length === 0, `Leaked in ${leakedOptions.length} questions`);
		assert('PROT-05', 'Zero questions leak explanation to Student before submission', leakedExpl.length === 0, `Leaked in ${leakedExpl.length} questions`);

		// Fetch as Trainer (authorized trainer should see correct_option)
		const tAsmView = await request(`/api/assessments/${sampleAsmId}`, {
			headers: { Cookie: `placetrack_session=${trainerCookie}` }
		});
		assert('PROT-06', 'Trainer can view assessment with answer keys', tAsmView.json?.assessment?.questions?.some((q) => !!q.correct_option || !!q.correctOption));
	} else {
		console.log('  ⚠️ Skipping PROT-02..06: No assessment records available');
	}

	// 5.2 Submit coding solution and verify hidden test cases are masked in API response
	const codeSubmitRes = await request('/api/code/submit', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: {
			problemId: 'prob-var-01',
			language: 'python',
			code: 'import sys\nline = sys.stdin.read().split()\nif line:\n    a, b = int(line[0]), int(line[1])\n    print(f"{b} {a}")'
		}
	});
	assert('PROT-07', 'Student code submission succeeds (200 OK)', codeSubmitRes.status === 200, `Got ${codeSubmitRes.status}`);
	const tcResults = codeSubmitRes.json?.testCaseResults || [];
	assert('PROT-08', 'Code evaluation returns test case results', tcResults.length > 0);

	const hiddenCases = tcResults.filter((tc) => tc.isHidden === true);
	assert('PROT-09', 'Hidden test cases are present in evaluation', hiddenCases.length > 0);
	const leakedHiddenInput = hiddenCases.filter((tc) => !tc.input.includes('Hidden') && tc.input !== '');
	const leakedHiddenOutput = hiddenCases.filter((tc) => !tc.expectedOutput.includes('Hidden') && tc.expectedOutput !== '');
	assert('PROT-10', 'Hidden test case inputs are masked in API response', leakedHiddenInput.length === 0, `Leaked: ${JSON.stringify(leakedHiddenInput)}`);
	assert('PROT-11', 'Hidden test case expected outputs are masked in API response', leakedHiddenOutput.length === 0, `Leaked: ${JSON.stringify(leakedHiddenOutput)}`);

	// ============================================================================
	// SUITE 6: FILE UPLOAD SECURITY & VALIDATION
	// ============================================================================
	console.log('\n--- SUITE 6: File Upload Security & Validation ---');

	// 6.1 Unauthenticated upload attempt
	const anonUpload = await request('/api/materials', {
		method: 'POST',
		body: { title: 'Malicious Upload', fileName: 'test.pdf', fileContent: 'dummy content' }
	});
	assert('UPL-01', 'Unauthenticated material upload rejected (401 Unauthorized or 403 Forbidden)', anonUpload.status === 401 || anonUpload.status === 403, `Got ${anonUpload.status}`);

	// 6.2 Student upload attempt
	const studentUpload = await request('/api/materials', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: { title: 'Student Upload Attempt', fileName: 'test.pdf', fileContent: 'dummy content' }
	});
	assert('UPL-02', 'Student material upload rejected (403 Forbidden)', studentUpload.status === 403, `Got ${studentUpload.status}`);

	// 6.3 Disallowed file extension (.exe)
	const exeUpload = await request('/api/materials', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${trainerCookie}` },
		body: {
			title: 'Malicious Executable',
			fileName: 'payload.exe',
			fileContent: 'MZ executable binary data',
			category: 'technical'
		}
	});
	assert('UPL-03', 'Disallowed file extension (.exe) rejected (400 Bad Request)', exeUpload.status === 400, `Got ${exeUpload.status}`);
	assert('UPL-04', 'Rejection response identifies invalid file type', exeUpload.json?.error === 'InvalidFileType');

	// 6.4 Disallowed file extension (.sh)
	const shUpload = await request('/api/materials', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${trainerCookie}` },
		body: {
			title: 'Shell Script',
			fileName: 'exploit.sh',
			fileContent: '#!/bin/bash\nrm -rf /',
			category: 'technical'
		}
	});
	assert('UPL-05', 'Disallowed script extension (.sh) rejected (400 Bad Request)', shUpload.status === 400, `Got ${shUpload.status}`);

	// 6.5 Oversized file upload (> 25 MB)
	// Create a simulated 26 MB string
	const oversizedPayload = 'A'.repeat(26 * 1024 * 1024);
	const bigUpload = await request('/api/materials', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${trainerCookie}` },
		body: {
			title: 'Oversized Handout',
			fileName: 'giant_book.pdf',
			fileContent: oversizedPayload,
			category: 'technical'
		}
	});
	assert('UPL-06', 'File exceeding 25 MB limit rejected (413 Payload Too Large)', bigUpload.status === 413, `Got ${bigUpload.status}`);

	// 6.6 Valid file upload by Trainer (.md)
	const validUpload = await request('/api/materials', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${trainerCookie}` },
		body: {
			title: 'Security Architecture Guide 2026',
			description: 'Best practices for multi-tier RBAC and session security',
			category: 'technical',
			categoryLabel: 'Technical DSA',
			fileName: 'security_handbook.md',
			fileContent: '# Security Architecture\n\nAll credentials must remain behind authenticated backend APIs.',
			importance: 'High'
		}
	});
	assert('UPL-07', 'Valid study material upload by Trainer succeeds (200/201)', validUpload.status === 200 || validUpload.status === 201, `Got ${validUpload.status}`);

	// ============================================================================
	// SUITE 7: AI SERVICE RATE LIMITING & PROTECTION
	// ============================================================================
	console.log('\n--- SUITE 7: AI Service Rate Limiting & Protection ---');

	// 7.1 Unauthenticated access to AI assistant
	const anonAI = await request('/api/ai/coding-assistant', {
		method: 'POST',
		body: { action: 'explain_problem', problemId: 'prob-var-01' }
	});
	assert('AI-01', 'Unauthenticated request to AI assistant rejected (401)', anonAI.status === 401, `Got ${anonAI.status}`);

	// 7.2 Missing action payload
	const badAIPayload = await request('/api/ai/coding-assistant', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: {}
	});
	assert('AI-02', 'AI assistant request without action rejected (400)', badAIPayload.status === 400, `Got ${badAIPayload.status}`);

	// 7.3 Rate limiting test: Send rapid bursts
	console.log('  Testing AI Assistant rate limiter (sending 32 rapid requests)...');
	let rateLimitedHit = false;
	let lastStatus = 200;
	for (let i = 0; i < 35; i++) {
		const burstRes = await request('/api/ai/coding-assistant', {
			method: 'POST',
			headers: { Cookie: `placetrack_session=${studentCookie}` },
			body: { action: 'explain_problem', problemId: 'prob-var-01' }
		});
		lastStatus = burstRes.status;
		if (burstRes.status === 429) {
			rateLimitedHit = true;
			break;
		}
		await new Promise((r) => setTimeout(r, 20));
	}
	assert('AI-03', 'Rate limiter triggers 429 Too Many Requests when threshold exceeded', rateLimitedHit, `Last Status: ${lastStatus}`);

	// ============================================================================
	// SUITE 8: LOGOUT & SESSION INVALIDATION
	// ============================================================================
	console.log('\n--- SUITE 8: Logout & Session Invalidation ---');

	const logoutRes = await request('/api/auth/logout', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` }
	});
	assert('SES-01', 'Logout endpoint returns 200 OK', logoutRes.status === 200, `Got ${logoutRes.status}`);

	const postLogoutCookie = logoutRes.sessionCookie;
	assert('SES-02', 'Logout clears session cookie (empty or maxAge=0)', !postLogoutCookie || postLogoutCookie === '');

	// Subsequent request without cookie returns 401
	const postLogoutMe = await request('/api/auth/me');
	assert('SES-03', 'Subsequent request without cookie rejected (401)', postLogoutMe.status === 401, `Got ${postLogoutMe.status}`);

	// ============================================================================
	// SUMMARY REPORT
	// ============================================================================
	console.log('\n================================================================');
	console.log(`📊 SECURITY AUDIT COMPLETE: ${passed + failed} Total Checks`);
	console.log(`   Passed: ${passed}`);
	console.log(`   Failed: ${failed}`);
	console.log('================================================================\n');

	if (failures.length > 0) {
		console.log('FAILURES TO RESOLVE:');
		failures.forEach((f) => console.log(` - ${f}`));
		process.exit(1);
	} else {
		console.log('🎉 ALL RUNTIME SECURITY & RBAC CHECKS PASSED WITH ZERO FAILURES!');
		process.exit(0);
	}
}

runSecuritySuite().catch((err) => {
	console.error('Fatal test runner exception:', err);
	process.exit(1);
});
