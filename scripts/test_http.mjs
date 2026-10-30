async function run() {
	console.log('--- 1. Testing Login as Student ---');
	const loginRes = await fetch('http://localhost:5173/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			identifier: 'student@placetrack.ai',
			password: 'password123'
		})
	});
	const loginJson = await loginRes.json();
	console.log('Login Status:', loginRes.status);
	console.log('Login Result:', loginJson);

	const token = loginJson.token;
	const authHeader = { Authorization: `Bearer ${token}` };

	console.log('\n--- 2. Testing /api/assessments with Student Token ---');
	const asmRes = await fetch('http://localhost:5173/api/assessments', {
		headers: authHeader
	});
	const asmJson = await asmRes.json();
	console.log('Assessments Status:', asmRes.status);
	console.log(`Assessments returned (${asmJson.assessments?.length}):`, asmJson.assessments?.map(a => `${a.title} [${a.category}]`));

	console.log('\n--- 3. Testing Student Profile API ---');
	const profRes = await fetch('http://localhost:5173/api/student/profile', {
		headers: authHeader
	});
	const profJson = await profRes.json();
	console.log('Profile Status:', profRes.status);
	console.log('Profile Data:', profJson);

	console.log('\n--- 4. Testing HTML page rendering of /student/profile with Cookie ---');
	const pageRes = await fetch('http://localhost:5173/student/profile', {
		headers: {
			Cookie: `placetrack_session=${token}`
		}
	});
	console.log('Page Status:', pageRes.status);
	const html = await pageRes.text();
	console.log('HTML length:', html.length);
	console.log('Contains "Alex Morgan":', html.includes('Alex Morgan'));
	console.log('Contains "2022CS1042":', html.includes('2022CS1042'));
	console.log('Contains "Quantitative Aptitude":', html.includes('Quantitative Aptitude'));
	console.log('Contains "Verbal Ability":', html.includes('Verbal Ability'));
	console.log('Contains "Weak Area Identified":', html.includes('Weak Area Identified'));
	console.log('Contains "Personalized Practice & Study Recommendations":', html.includes('Personalized Practice & Study Recommendations'));
	console.log('Contains "Verified Assessment History":', html.includes('Verified Assessment History'));

	console.log('\n--- 5. Testing Trainer Dashboard Access ---');
	const trainerLogin = await fetch('http://localhost:5173/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			identifier: 'trainer@placetrack.ai',
			password: 'password123'
		})
	});
	const trainerJson = await trainerLogin.json();
	const trainerToken = trainerJson.token;
	const trainerPageRes = await fetch('http://localhost:5173/trainer/dashboard', {
		headers: { Cookie: `placetrack_session=${trainerToken}` }
	});
	console.log('Trainer Dashboard HTTP Status:', trainerPageRes.status);
	const trainerHtml = await trainerPageRes.text();
	console.log('Trainer page length:', trainerHtml.length);
	console.log('Contains "Assessments Hub":', trainerHtml.includes('Assessments') || trainerHtml.includes('MCQ'));
}

run().catch(console.error);
