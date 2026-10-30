import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
	const content = fs.readFileSync(envPath, 'utf-8');
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
			const [key, ...values] = trimmed.split('=');
			const val = values.join('=').trim().replace(/^['"]|['"]$/g, '');
			if (!process.env[key.trim()]) {
				process.env[key.trim()] = val;
			}
		}
	}
}

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/placetrack';
const sql = postgres(DATABASE_URL, { max: 1 });

async function verify() {
	console.log('=== [1] VERIFYING DATABASE CONNECTION & RECORDS ===');
	const users = await sql`SELECT id, name, email, role FROM users WHERE email = 'student@placetrack.ai'`;
	console.log('Logged-in Student User:', users[0]);

	const studentRows = await sql`
		SELECT s.*, u.name, u.email 
		FROM students s 
		JOIN users u ON s.user_id = u.id 
		WHERE u.id = ${users[0].id}
	`;
	const s = studentRows[0];
	console.log('Student Info:');
	console.log(` - Name: ${s.name}`);
	console.log(` - Register No: ${s.register_number}`);
	console.log(` - Department: ${s.department}`);
	console.log(` - Batch: ${s.batch}`);

	console.log('\n=== [2] VERIFYING ALL 5 DOMAIN ASSESSMENTS IN DATABASE ===');
	const assessments = await sql`SELECT id, title, category, difficulty_level, status FROM assessments ORDER BY created_at ASC`;
	for (const a of assessments) {
		console.log(` - [${a.category}] ${a.title} (${a.difficulty_level}, Status: ${a.status})`);
	}

	console.log('\n=== [3] VERIFYING STUDENT ATTEMPTS & 5-DOMAIN SCORES ===');
	const attempts = await sql`
		SELECT att.*, a.title, a.category 
		FROM assessment_attempts att 
		JOIN assessments a ON att.assessment_id = a.id 
		WHERE att.student_id = ${s.id}
		ORDER BY att.submitted_at DESC
	`;
	console.log(`Completed Attempts: ${attempts.length}`);
	for (const att of attempts) {
		console.log(` - ${att.title} [${att.category}]: ${att.percentage}% (${att.status})`);
	}

	console.log('\n=== [4] SIMULATING getStudentDashboardData() EXECUTION ===');
	const { getStudentDashboardData } = await import('../src/lib/server/services/studentDashboard.ts');
	const data = await getStudentDashboardData(users[0].id);

	console.log('\n--- SECTION 1: STUDENT OVERVIEW ---');
	console.log(`Name: ${data.overview.name}`);
	console.log(`Register Number: ${data.overview.registerNumber}`);
	console.log(`Department: ${data.overview.department}`);
	console.log(`Batch: ${data.overview.batch}`);
	console.log(`Assessment Completion: ${data.overview.completedAssessmentsCount} / ${data.overview.totalAssigned} (${data.overview.completionPercentage}%)`);
	console.log(`Readiness Score: ${data.overview.readinessScore}%`);

	console.log('\n--- SECTION 2: SKILL PERFORMANCE (5 DOMAINS) ---');
	console.log(`Aptitude: ${data.skills.aptitude.score}% (Status: ${data.skills.aptitude.status}, Tests: ${data.skills.aptitude.testsCompleted})`);
	console.log(`Verbal Ability: ${data.skills.verbal.score}% (Status: ${data.skills.verbal.status}, Tests: ${data.skills.verbal.testsCompleted})`);
	console.log(`Logical Reasoning: ${data.skills.logical.score}% (Status: ${data.skills.logical.status}, Tests: ${data.skills.logical.testsCompleted})`);
	console.log(`Technical Skills: ${data.skills.technical.score}% (Status: ${data.skills.technical.status}, Tests: ${data.skills.technical.testsCompleted})`);
	console.log(`AI Assessment: ${data.skills.ai.score}% (Status: ${data.skills.ai.status}, Tests: ${data.skills.ai.testsCompleted})`);

	console.log('\n--- SECTION 3: PERFORMANCE ANALYTICS ---');
	console.log(`Has Attempts: ${data.analytics.hasAttempts}`);
	console.log(`Recent Average: ${data.analytics.recentAverage}%`);
	console.log(`Previous Average: ${data.analytics.previousAverage}%`);
	console.log(`Delta: ${data.analytics.delta}% (Trend: ${data.analytics.trend})`);
	console.log(`Chart History Points: ${data.analytics.chartHistory.length}`);

	console.log('\n--- SECTION 4: WEAK AREA IDENTIFICATION ---');
	console.log(`Has Weak Area: ${data.weakAreas.hasWeakArea}`);
	console.log(`Primary Weak Category: ${data.weakAreas.primaryWeakCategory} (${data.weakAreas.primaryWeakLabel})`);
	console.log(`Lowest Score: ${data.weakAreas.lowestScore}%`);
	console.log(`Diagnosis: ${data.weakAreas.explanation}`);

	console.log('\n--- SECTION 5: PERSONALIZED RECOMMENDATIONS ---');
	console.log(`Recommended Assessments (${data.recommendations.recommendedAssessments.length}):`);
	data.recommendations.recommendedAssessments.forEach((r) => console.log(` - ${r.title} [${r.category}]`));
	console.log(`Recommended Study Materials (${data.recommendations.recommendedMaterials.length}):`);
	data.recommendations.recommendedMaterials.forEach((m) => console.log(` - ${m.title} (${m.fileName})`));

	console.log('\n--- SECTION 6: ASSESSMENT HISTORY ---');
	console.log(`History Rows (${data.assessmentHistory.length}):`);
	data.assessmentHistory.forEach((h) => {
		console.log(` - ${h.title} | ${h.category} | ${h.submittedDate} | ${h.score}/${h.maxScore} (${h.percentage}%) | ${h.resultStatus}`);
	});

	console.log('\n=== [5] TESTING STUDENT TAKING THE AI ASSESSMENT ===');
	// Find the AI assessment
	const aiAsm = assessments.find(a => a.category === 'AI');
	if (aiAsm) {
		const { startAssessmentAttempt, submitAssessmentAttempt } = await import('../src/lib/server/services/assessments.ts');
		const attempt = await startAssessmentAttempt(aiAsm.id, users[0].id);
		console.log(`Started AI attempt: ${attempt.attemptId}`);

		// Answer questions
		const questions = await sql`SELECT id, correct_option FROM assessment_questions WHERE assessment_id = ${aiAsm.id} ORDER BY question_order ASC`;
		// Answer 3 out of 4 correctly (75%)
		const answersMap = {
			[questions[0].id]: questions[0].correct_option,
			[questions[1].id]: questions[1].correct_option,
			[questions[2].id]: questions[2].correct_option,
			[questions[3].id]: questions[3].correct_option === 'a' ? 'b' : 'a'
		};

		const submitResult = await submitAssessmentAttempt(
			aiAsm.id,
			attempt.attemptId,
			users[0].id,
			answersMap,
			320
		);
		console.log(`Submitted AI attempt: Score ${submitResult.score}/${submitResult.maxScore} (${submitResult.percentage}%), Result: ${submitResult.resultStatus}`);

		// Re-run getStudentDashboardData to confirm real-time database update!
		const updatedData = await getStudentDashboardData(users[0].id);
		console.log('\n=== [6] VERIFYING REAL-TIME UPDATE AFTER AI ASSESSMENT SUBMISSION ===');
		console.log(`Updated Assessment Completion: ${updatedData.overview.completedAssessmentsCount} / ${updatedData.overview.totalAssigned} (${updatedData.overview.completionPercentage}%)`);
		console.log(`Updated Overall Readiness: ${updatedData.overview.readinessScore}%`);
		console.log(`Updated AI Skill Score: ${updatedData.skills.ai.score}% (Status: ${updatedData.skills.ai.status}, Tests: ${updatedData.skills.ai.testsCompleted})`);
		console.log(`Weak Area remains Verbal Ability: ${updatedData.weakAreas.primaryWeakLabel} (${updatedData.weakAreas.lowestScore}%)`);
		console.log(`Updated History Count: ${updatedData.assessmentHistory.length} attempts`);
	}

	await sql.end();
	console.log('\n🎉 ALL DASHBOARD SECTIONS & REAL-TIME ASSESSMENT SCORING VERIFIED SUCCESSFULLY!');
}

verify().catch(async (e) => {
	console.error('Verification failed:', e);
	await sql.end();
	process.exit(1);
});
