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

async function migrate() {
	await sql`
		CREATE TABLE IF NOT EXISTS student_ai_predictions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			readiness_score NUMERIC(5,2) NOT NULL,
			readiness_category VARCHAR(50) NOT NULL,
			strongest_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
			weakest_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
			input_features JSONB NOT NULL DEFAULT '{}'::jsonb,
			recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
			suggested_assessments JSONB NOT NULL DEFAULT '[]'::jsonb,
			model_version VARCHAR(50) NOT NULL DEFAULT 'rf-v1.0',
			model_algorithm VARCHAR(100) NOT NULL DEFAULT 'Random Forest Classifier & Regressor',
			confidence_score NUMERIC(5,2),
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`CREATE INDEX IF NOT EXISTS idx_ai_predictions_student_id ON student_ai_predictions (student_id)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_ai_predictions_created_at ON student_ai_predictions (created_at DESC)`;

	console.log('✓ student_ai_predictions table created successfully in PostgreSQL.');
	await sql.end();
}

migrate().catch(async (e) => {
	console.error('Migration failed:', e);
	await sql.end();
	process.exit(1);
});
