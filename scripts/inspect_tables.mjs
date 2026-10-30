import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function main() {
	const tasksCount = await sql`SELECT count(*) FROM trainer_tasks`;
	const materialsCount = await sql`SELECT count(*) FROM study_materials`;
	const studentsCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'students'`;
	const taskCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'trainer_tasks'`;
	const matCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'study_materials'`;
	const students = await sql`SELECT s.id, u.name, s.department, s.batch, s.readiness_score, s.readiness_status FROM students s JOIN users u ON s.user_id = u.id`;

	console.log('tasksCount:', tasksCount[0].count);
	console.log('materialsCount:', materialsCount[0].count);
	console.log('students cols:', studentsCols.map(c => c.column_name).join(', '));
	console.log('task cols:', taskCols.map(c => c.column_name).join(', '));
	console.log('mat cols:', matCols.map(c => c.column_name).join(', '));
	console.log('students:', students);
	await sql.end();
}

main().catch(async (e) => {
	console.error(e);
	await sql.end();
});
