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

async function main() {
  const users = await sql`SELECT id, name, email, role FROM users`;
  console.log('Users count:', users.length);
  const students = await sql`SELECT id, user_id, register_number, department, batch, readiness_score FROM students`;
  console.log('Students count:', students.length);
  const assessments = await sql`SELECT id, title, category, status FROM assessments`;
  console.log('Assessments count:', assessments.length);
  console.log('Assessments:', assessments);
  const attempts = await sql`SELECT id, student_id, assessment_id, score, percentage, status FROM assessment_attempts`;
  console.log('Attempts count:', attempts.length);
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
});
