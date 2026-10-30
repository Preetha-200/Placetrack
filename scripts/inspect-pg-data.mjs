import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
	const content = fs.readFileSync(envPath, 'utf8');
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
			const [key, ...values] = trimmed.split('=');
			process.env[key.trim()] = values.join('=').trim().replace(/^['"]|['"]$/g, '');
		}
	}
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/placetrack';
console.log('Connecting to:', dbUrl.replace(/:[^:@]+@/, ':***@'));

const sql = postgres(dbUrl, { max: 1, timeout: 5 });

async function inspect() {
	try {
		const tables = await sql`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = 'public' 
			ORDER BY table_name;
		`;
		console.log('\n--- Existing PostgreSQL Tables ---');
		for (const t of tables) {
			const countRes = await sql.unsafe(`SELECT COUNT(*) as count FROM "${t.table_name}"`);
			console.log(`Table: ${t.table_name.padEnd(25)} -> ${countRes[0].count} rows`);
		}

		console.log('\n--- Foreign Keys & Relationships ---');
		const fks = await sql`
			SELECT
				tc.table_name, 
				kcu.column_name, 
				ccu.table_name AS foreign_table_name,
				ccu.column_name AS foreign_column_name 
			FROM information_schema.table_constraints AS tc 
			JOIN information_schema.key_column_usage AS kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			JOIN information_schema.constraint_column_usage AS ccu
				ON ccu.constraint_name = tc.constraint_name
				AND ccu.table_schema = tc.table_schema
			WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
			ORDER BY tc.table_name;
		`;
		for (const fk of fks) {
			console.log(`${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
		}
	} catch (e) {
		console.error('Error inspecting PostgreSQL:', e);
	} finally {
		await sql.end();
	}
}

inspect();
