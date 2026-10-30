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

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/placetrack';

// Import service
const { getStudentDashboardData } = await import('../src/lib/server/services/studentDashboard.ts');

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const users = await sql`SELECT id FROM users WHERE email = 'student@placetrack.ai'`;
await sql.end();

const res = await getStudentDashboardData(users[0].id);
console.log('OVERVIEW:', res.overview);
console.log('SKILLS:', res.skills);
console.log('ANALYTICS:', res.analytics);
console.log('WEAK AREAS:', res.weakAreas);
console.log('RECOMMENDATIONS:', res.recommendations);
console.log('HISTORY COUNT:', res.assessmentHistory.length);
