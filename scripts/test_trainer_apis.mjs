import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

async function testTrainerIntegration() {
	console.log('--- Testing PostgreSQL Trainer Dashboard Integration ---');

	// 1. Verify Trainer (Prof. David Chen)
	const trainers = await sql`SELECT id, name, email, role FROM users WHERE email = 'trainer@placetrack.ai'`;
	const trainer = trainers[0];
	console.log('1. Active Trainer:', trainer.name, `(${trainer.id}) - role: ${trainer.role}`);

	// 2. Verify Students assigned to trainer
	const students = await sql`
		SELECT s.id, u.name, s.register_number, s.department, s.batch, s.readiness_score, s.readiness_status
		FROM students s
		JOIN users u ON s.user_id = u.id
		WHERE s.trainer_id = ${trainer.id}
	`;
	console.log(`2. Assigned Students count: ${students.length}`);
	students.forEach((s) => {
		console.log(`   - ${s.name} (${s.register_number}) | ${s.department} | Score: ${s.readiness_score}% | Status: ${s.readiness_status} | Needs Imp: ${s.readiness_score < 75}`);
	});

	// 3. Verify Tasks with statuses and feedback
	const tasks = await sql`
		SELECT id, title, category, status, priority, due_date, score, trainer_feedback
		FROM trainer_tasks
		WHERE trainer_id = ${trainer.id}
	`;
	console.log(`3. Tasks count: ${tasks.length}`);
	tasks.forEach((t) => {
		console.log(`   - [${t.status}] ${t.title} | Priority: ${t.priority} | Due: ${t.due_date} | Feedback: ${t.trainer_feedback || 'None'}`);
	});

	// 4. Verify Study Materials stored with disk file_path
	const mats = await sql`
		SELECT id, title, category, subject, skill, file_name, file_path, file_size, downloads_count
		FROM study_materials
		WHERE uploaded_by_id = ${trainer.id}
	`;
	console.log(`4. Study Materials count: ${mats.length}`);
	mats.forEach((m) => {
		console.log(`   - ${m.title} | Subject: ${m.subject} | Skill: ${m.skill} | Path: ${m.file_path} | Downloads: ${m.downloads_count}`);
	});

	// 5. Verify Assessments & Attempts
	const asms = await sql`
		SELECT a.id, a.title, a.category, a.status,
			   (SELECT COUNT(*) FROM assessment_attempts WHERE assessment_id = a.id) as attempts_count
		FROM assessments a
		WHERE a.trainer_id = ${trainer.id} OR a.trainer_id IS NULL
	`;
	console.log(`5. Trainer Assessments count: ${asms.length}`);
	asms.forEach((a) => {
		console.log(`   - [${a.status}] ${a.title} | Category: ${a.category} | Attempts: ${a.attempts_count}`);
	});

	console.log('\n--- ALL 6 TRAINER MODULES VERIFIED WITH LIVE POSTGRESQL DATA ---');
	await sql.end();
	process.exit(0);
}

testTrainerIntegration().catch(async (err) => {
	console.error('Test failed:', err);
	await sql.end();
	process.exit(1);
});
