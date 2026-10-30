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
    redirect: 'manual'
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
    sessionCookie
  };
}

async function run() {
  console.log('--- 1. Verifying Coordinator Analytics & Roster ---');
  const coordLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'coordinator@placetrack.ai', password: 'password123', role: 'coordinator' }
  });

  if (coordLogin.status !== 200 || !coordLogin.sessionCookie) {
    console.error('Failed to login as coordinator:', coordLogin.text);
    process.exit(1);
  }

  const coordCookie = coordLogin.sessionCookie;
  const coordDash = await request('/coordinator/dashboard', {
    headers: { Cookie: `placetrack_session=${coordCookie}` }
  });

  console.log('Coordinator dashboard response status:', coordDash.status);
  if (coordDash.status !== 200) {
    console.error('Coordinator dashboard failed to return 200');
    process.exit(1);
  }

  const hasStudentScholarCoord = coordDash.text.includes('Student Scholar');
  console.log('Fake "Student Scholar" text in coordinator dashboard:', hasStudentScholarCoord);
  if (hasStudentScholarCoord) {
    console.error('FAIL: Found hardcoded "Student Scholar" in coordinator dashboard!');
    process.exit(1);
  }

  console.log('\n--- 2. Verifying Student Profile & Dashboard ---');
  const studentLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'student@placetrack.ai', password: 'password123', role: 'student' }
  });

  if (studentLogin.status !== 200 || !studentLogin.sessionCookie) {
    console.error('Failed to login as student:', studentLogin.text);
    process.exit(1);
  }

  const studentCookie = studentLogin.sessionCookie;
  const studentDash = await request('/student/profile', {
    headers: { Cookie: `placetrack_session=${studentCookie}` }
  });

  console.log('Student profile response status:', studentDash.status);
  if (studentDash.status !== 200) {
    console.error('Student dashboard failed to return 200');
    process.exit(1);
  }

  const hasStudentScholarStudent = studentDash.text.includes('Student Scholar');
  console.log('Fake "Student Scholar" text in student dashboard:', hasStudentScholarStudent);
  if (hasStudentScholarStudent) {
    console.error('FAIL: Found hardcoded "Student Scholar" in student dashboard!');
    process.exit(1);
  }

  console.log('\n--- 3. Verifying Student Roster on Coordinator Portal ---');
  const studentsPage = await request('/coordinator/students', {
    headers: { Cookie: `placetrack_session=${coordCookie}` }
  });
  console.log('/coordinator/students response status:', studentsPage.status);
  const hasRealStudentsInRoster = studentsPage.text.includes('2024MCA');
  console.log('Verified real students in roster (2024MCA prefix):', hasRealStudentsInRoster);
  if (!hasRealStudentsInRoster) {
    console.error('FAIL: Expected real students with 2024MCA register numbers in coordinator students roster!');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('✅ ALL PHASE 2 VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
