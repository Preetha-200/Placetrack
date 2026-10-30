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
	const tables = ['users', 'students', 'companies', 'placement_drives', 'applications', 'placement_offers', 'study_materials', 'trainer_tasks', 'assessments', 'assessment_questions', 'assessment_attempts', 'quiz_attempts'];
	for (const tbl of tables) {
		try {
			const res = await sql.unsafe(`SELECT count(*) FROM ${tbl}`);
			console.log(`Table ${tbl}: ${res[0].count} rows`);
		} catch (e) {
			console.log(`Table ${tbl}: ERROR (${e.message})`);
		}
	}
	await sql.end();
	process.exit(0);
}

main().catch(async (e) => {
	console.error(e);
	await sql.end();
	process.exit(1);
});
