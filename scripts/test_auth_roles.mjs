import http from 'node:http';

const BASE_URL = 'http://localhost:5173';

async function request(path, options = {}) {
	const url = `${BASE_URL}${path}`;
	const headers = options.headers || {};
	if (options.body && !headers['Content-Type']) {
		headers['Content-Type'] = 'application/json';
	}

	const res = await fetch(url, {
		method: options.method || 'GET',
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined,
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

async function runTests() {
	console.log('====================================================');
	console.log('🚀 RUNNING COMPREHENSIVE END-TO-END AUTH & ROLE TESTS');
	console.log('====================================================\n');

	let passed = 0;
	let failed = 0;

	function assert(desc, condition, detail = '') {
		if (condition) {
			console.log(`  ✅ PASS: ${desc}`);
			passed++;
		} else {
			console.error(`  ❌ FAIL: ${desc} ${detail ? `(${detail})` : ''}`);
			failed++;
		}
	}

	// ----------------------------------------------------
	// TEST 1: STUDENT LOGIN & AUTHENTICATION
	// ----------------------------------------------------
	console.log('\n--- 1. Testing Student Authentication ---');
	const studentLogin = await request('/api/auth/login', {
		method: 'POST',
		body: { username: 'student@placetrack.ai', password: 'password123', role: 'student' }
	});

	assert('Student login returns 200 OK', studentLogin.status === 200, `Got ${studentLogin.status}`);
	assert('Student login returns user object with role STUDENT', studentLogin.json?.user?.role === 'STUDENT', JSON.stringify(studentLogin.json?.user));
	assert('Student login returns session cookie', !!studentLogin.sessionCookie);
	assert('Student login returns redirect to dashboard', studentLogin.json?.redirectTo === '/student/dashboard');

	const studentCookie = studentLogin.sessionCookie;

	// Verify /api/auth/me for Student
	const studentMe = await request('/api/auth/me', {
		headers: { Cookie: `placetrack_session=${studentCookie}` }
	});
	assert('/api/auth/me returns 200 for Student', studentMe.status === 200, `Got ${studentMe.status}`);
	assert('/api/auth/me returns role STUDENT', studentMe.json?.role === 'STUDENT', JSON.stringify(studentMe.json));

	// ----------------------------------------------------
	// TEST 2: TRAINER LOGIN & AUTHENTICATION
	// ----------------------------------------------------
	console.log('\n--- 2. Testing Trainer Authentication ---');
	const trainerLogin = await request('/api/auth/login', {
		method: 'POST',
		body: { username: 'trainer@placetrack.ai', password: 'password123', role: 'trainer' }
	});

	assert('Trainer login returns 200 OK', trainerLogin.status === 200, `Got ${trainerLogin.status}`);
	assert('Trainer login returns user object with role TRAINER', trainerLogin.json?.user?.role === 'TRAINER', JSON.stringify(trainerLogin.json?.user));
	assert('Trainer login returns session cookie', !!trainerLogin.sessionCookie);
	assert('Trainer login returns redirect to /trainer/dashboard', trainerLogin.json?.redirectTo === '/trainer/dashboard');

	const trainerCookie = trainerLogin.sessionCookie;

	// Verify /api/auth/me for Trainer
	const trainerMe = await request('/api/auth/me', {
		headers: { Cookie: `placetrack_session=${trainerCookie}` }
	});
	assert('/api/auth/me returns 200 for Trainer', trainerMe.status === 200, `Got ${trainerMe.status}`);
	assert('/api/auth/me returns role TRAINER', trainerMe.json?.role === 'TRAINER', JSON.stringify(trainerMe.json));

	// ----------------------------------------------------
	// TEST 3: PLACEMENT COORDINATOR LOGIN & AUTHENTICATION
	// ----------------------------------------------------
	console.log('\n--- 3. Testing Coordinator Authentication ---');
	const coordLogin = await request('/api/auth/login', {
		method: 'POST',
		body: { username: 'coordinator@placetrack.ai', password: 'password123', role: 'coordinator' }
	});

	assert('Coordinator login returns 200 OK', coordLogin.status === 200, `Got ${coordLogin.status}`);
	assert('Coordinator login returns user object with role PLACEMENT_COORDINATOR', coordLogin.json?.user?.role === 'PLACEMENT_COORDINATOR', JSON.stringify(coordLogin.json?.user));
	assert('Coordinator login returns session cookie', !!coordLogin.sessionCookie);
	assert('Coordinator login returns redirect to /coordinator/dashboard', coordLogin.json?.redirectTo === '/coordinator/dashboard');

	const coordCookie = coordLogin.sessionCookie;

	// Verify /api/auth/me for Coordinator
	const coordMe = await request('/api/auth/me', {
		headers: { Cookie: `placetrack_session=${coordCookie}` }
	});
	assert('/api/auth/me returns 200 for Coordinator', coordMe.status === 200, `Got ${coordMe.status}`);
	assert('/api/auth/me returns role PLACEMENT_COORDINATOR', coordMe.json?.role === 'PLACEMENT_COORDINATOR', JSON.stringify(coordMe.json));

	// ----------------------------------------------------
	// TEST 4: TRAINER APIS & DASHBOARD ACCESS
	// ----------------------------------------------------
	console.log('\n--- 4. Testing Trainer APIs & Dashboard Data ---');
	const trainerTasks = await request('/api/tasks', {
		headers: { Cookie: `placetrack_session=${trainerCookie}` }
	});
	assert('Trainer can fetch /api/tasks (200)', trainerTasks.status === 200 && Array.isArray(trainerTasks.json?.tasks), `Got ${trainerTasks.status}`);

	const trainerAssessments = await request('/api/assessments', {
		headers: { Cookie: `placetrack_session=${trainerCookie}` }
	});
	assert('Trainer can fetch /api/assessments (200)', trainerAssessments.status === 200 && Array.isArray(trainerAssessments.json?.assessments), `Got ${trainerAssessments.status}`);

	// ----------------------------------------------------
	// TEST 5: COORDINATOR APIS & DASHBOARD ACCESS
	// ----------------------------------------------------
	console.log('\n--- 5. Testing Coordinator APIs & Dashboard Data ---');
	const coordCompanies = await request('/api/coordinator/companies', {
		headers: { Cookie: `placetrack_session=${coordCookie}` }
	});
	assert('Coordinator can fetch /api/coordinator/companies (200)', coordCompanies.status === 200 && Array.isArray(coordCompanies.json?.companies), `Got ${coordCompanies.status}`);

	const coordDrives = await request('/api/coordinator/drives', {
		headers: { Cookie: `placetrack_session=${coordCookie}` }
	});
	assert('Coordinator can fetch /api/coordinator/drives (200)', coordDrives.status === 200 && Array.isArray(coordDrives.json?.drives), `Got ${coordDrives.status}`);

	const coordOffers = await request('/api/coordinator/offers', {
		headers: { Cookie: `placetrack_session=${coordCookie}` }
	});
	assert('Coordinator can fetch /api/coordinator/offers (200)', coordOffers.status === 200 && Array.isArray(coordOffers.json?.offers), `Got ${coordOffers.status}`);

	// ----------------------------------------------------
	// TEST 6: CROSS-ROLE ROUTE & API PROTECTION
	// ----------------------------------------------------
	console.log('\n--- 6. Testing Cross-Role Protection ---');
	
	// Student accessing Trainer route
	const studentToTrainer = await request('/trainer/dashboard', {
		headers: { Cookie: `placetrack_session=${studentCookie}` }
	});
	assert('Student accessing /trainer/dashboard gets redirected (303)', studentToTrainer.status === 303, `Got ${studentToTrainer.status}`);
	assert('Student is redirected to /student/dashboard', studentToTrainer.location === '/student/dashboard', `Location: ${studentToTrainer.location}`);

	// Student accessing Coordinator route
	const studentToCoord = await request('/coordinator/dashboard', {
		headers: { Cookie: `placetrack_session=${studentCookie}` }
	});
	assert('Student accessing /coordinator/dashboard gets redirected (303)', studentToCoord.status === 303, `Got ${studentToCoord.status}`);
	assert('Student is redirected to /student/dashboard', studentToCoord.location === '/student/dashboard', `Location: ${studentToCoord.location}`);

	// Trainer accessing Coordinator route
	const trainerToCoord = await request('/coordinator/dashboard', {
		headers: { Cookie: `placetrack_session=${trainerCookie}` }
	});
	assert('Trainer accessing /coordinator/dashboard gets redirected (303)', trainerToCoord.status === 303, `Got ${trainerToCoord.status}`);
	assert('Trainer is redirected to /trainer/dashboard', trainerToCoord.location === '/trainer/dashboard', `Location: ${trainerToCoord.location}`);

	// Coordinator accessing Trainer route
	const coordToTrainer = await request('/trainer/dashboard', {
		headers: { Cookie: `placetrack_session=${coordCookie}` }
	});
	assert('Coordinator accessing /trainer/dashboard gets redirected (303)', coordToTrainer.status === 303, `Got ${coordToTrainer.status}`);
	assert('Coordinator is redirected to /coordinator/dashboard', coordToTrainer.location === '/coordinator/dashboard', `Location: ${coordToTrainer.location}`);

	// Student attempting Coordinator-only API POST
	const studentPostCompany = await request('/api/coordinator/companies', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${studentCookie}` },
		body: { name: 'Unauthorized Corp', industry: 'IT' }
	});
	assert('Student calling Coordinator API is blocked (403 Forbidden)', studentPostCompany.status === 403, `Got ${studentPostCompany.status}`);

	// ----------------------------------------------------
	// TEST 7: INVALID CREDENTIALS & LOGOUT
	// ----------------------------------------------------
	console.log('\n--- 7. Testing Invalid Credentials & Logout ---');
	const invalidLogin = await request('/api/auth/login', {
		method: 'POST',
		body: { username: 'trainer@placetrack.ai', password: 'wrongpassword', role: 'trainer' }
	});
	assert('Invalid password rejected with 401 Unauthorized', invalidLogin.status === 401, `Got ${invalidLogin.status}`);

	const logoutRes = await request('/api/auth/logout', {
		method: 'POST',
		headers: { Cookie: `placetrack_session=${trainerCookie}` }
	});
	assert('Logout returns 200 OK', logoutRes.status === 200, `Got ${logoutRes.status}`);

	// ----------------------------------------------------
	// SUMMARY
	// ----------------------------------------------------
	console.log('\n====================================================');
	console.log(`TOTAL TESTS: ${passed + failed}`);
	console.log(`PASSED: ${passed}`);
	console.log(`FAILED: ${failed}`);
	console.log('====================================================');

	if (failed > 0) {
		process.exit(1);
	}
}

runTests().catch((e) => {
	console.error('Fatal test error:', e);
	process.exit(1);
});
