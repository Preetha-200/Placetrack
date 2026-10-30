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

async function test() {
	const alexUser = await sql`SELECT id, name, email FROM users WHERE email = 'student@placetrack.ai' LIMIT 1`;
	console.log('Alex user:', alexUser);

	const studentRows = await sql`
		SELECT s.*, u.name, u.email 
		FROM students s 
		JOIN users u ON s.user_id = u.id 
		WHERE u.email = 'student@placetrack.ai'
	`;
	console.log('Student details:', studentRows);

	const attempts = await sql`
		SELECT att.*, a.title, a.category 
		FROM assessment_attempts att 
		JOIN assessments a ON att.assessment_id = a.id 
		WHERE att.student_id = ${studentRows[0].id}
		ORDER BY att.submitted_at DESC
	`;
	console.log('Attempts for Alex:', attempts.map(a => ({
		title: a.title,
		category: a.category,
		score: a.score,
		percentage: a.percentage,
		status: a.status
	})));

	await sql.end();
}

test().catch(async (e) => {
	console.error(e);
	await sql.end();
});
