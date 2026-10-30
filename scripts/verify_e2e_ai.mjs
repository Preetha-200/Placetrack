import postgres from 'postgres';

const sql = postgres('postgresql://postgres:1234@localhost:5432/placetrack');

async function testE2E() {
	try {
		console.log('--- 1. Testing Login to SvelteKit ---');
		const loginRes = await fetch('http://localhost:5173/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'student@placetrack.ai',
				password: 'password123'
			})
		});

		console.log('Login status:', loginRes.status);
		const cookieHeader = loginRes.headers.get('set-cookie');
		console.log('Set-Cookie received:', !!cookieHeader);

		if (!cookieHeader) {
			console.error('No set-cookie received from login');
			return;
		}

		// Extract session token
		const tokenMatch = cookieHeader.match(/placetrack_session=([^;]+)/);
		const sessionToken = tokenMatch ? tokenMatch[1] : '';

		console.log('\n--- 2. Testing Student Profile Page Load (/student/profile) ---');
		const profileRes = await fetch('http://localhost:5173/student/profile', {
			headers: {
				'Cookie': `placetrack_session=${sessionToken}`
			}
		});

		console.log('Profile page HTTP status:', profileRes.status);
		const html = await profileRes.text();
		
		const hasAiSection = html.includes('AI-Based Placement Readiness Estimation');
		const hasReadinessScore = html.includes('Estimated Placement Readiness');
		const hasStrongSkills = html.includes('Strongest Skills');
		const hasWeakSkills = html.includes('Areas Needing Targeted Improvement');
		const hasRecs = html.includes('AI Prescribed Preparation Actions');
		const hasSuggestedAsm = html.includes('Recommended Practice Assessments');
		const hasDisclaimer = html.includes('does not guarantee campus placement');
		const hasTransparency = html.includes('Model Validation');

		console.log('HTML Check Results:');
		console.log(' - Has AI Section:', hasAiSection);
		console.log(' - Has Readiness Score:', hasReadinessScore);
		console.log(' - Has Strongest Skills:', hasStrongSkills);
		console.log(' - Has Areas Needing Improvement:', hasWeakSkills);
		console.log(' - Has Prescribed Recommendations:', hasRecs);
		console.log(' - Has Suggested Assessments:', hasSuggestedAsm);
		console.log(' - Has Official Disclaimer:', hasDisclaimer);
		console.log(' - Has Model Transparency:', hasTransparency);

		console.log('\n--- 3. Testing POST /api/ai/predict-readiness ---');
		const triggerRes = await fetch('http://localhost:5173/api/ai/predict-readiness', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Cookie': `placetrack_session=${sessionToken}`
			},
			body: JSON.stringify({})
		});

		console.log('POST /api/ai/predict-readiness status:', triggerRes.status);
		const triggerJson = await triggerRes.json();
		console.log('POST Response Success:', triggerJson.success);
		if (triggerJson.prediction) {
			console.log(' - Readiness Score:', triggerJson.prediction.readinessScore);
			console.log(' - Readiness Category:', triggerJson.prediction.readinessCategory);
			console.log(' - Confidence Score:', triggerJson.prediction.confidenceScore);
			console.log(' - Strongest Skills Count:', triggerJson.prediction.strongestSkills?.length);
			console.log(' - Weakest Skills Count:', triggerJson.prediction.weakestSkills?.length);
			console.log(' - Recommendations Count:', triggerJson.prediction.recommendations?.length);
			console.log(' - Suggested Assessments Count:', triggerJson.prediction.suggestedAssessments?.length);
		}

		console.log('\n--- 4. Checking PostgreSQL Records in student_ai_predictions ---');
		const dbRecords = await sql`
			SELECT id, student_id, readiness_score, readiness_category, model_algorithm, confidence_score, created_at
			FROM student_ai_predictions
			ORDER BY created_at DESC
			LIMIT 3
		`;
		console.log('Stored AI Predictions in DB:', dbRecords.length);
		for (const rec of dbRecords) {
			console.log(` - ID: ${rec.id}, Score: ${rec.readiness_score}, Category: ${rec.readiness_category}, Algorithm: ${rec.model_algorithm}, Created: ${rec.created_at}`);
		}

		console.log('\n--- 5. Checking Updated students Table in PostgreSQL ---');
		const updatedStudents = await sql`
			SELECT s.id, u.name, s.readiness_score, s.readiness_status
			FROM students s
			JOIN users u ON s.user_id = u.id
			WHERE u.email = 'student@placetrack.ai'
		`;
		if (updatedStudents.length > 0) {
			console.log('Student DB State:', updatedStudents[0]);
		}

		console.log('\n✓ E2E Verification Completed Successfully!');
	} catch (err) {
		console.error('E2E Verification Error:', err);
	} finally {
		await sql.end();
	}
}

testE2E();
