import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync } from 'node:crypto';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load .env if present
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

const DATABASE_URL = process.env.DATABASE_URL;

function hashPassword(password) {
	const salt = randomBytes(16).toString('hex');
	const hashBuffer = scryptSync(password, salt, 64);
	return `${salt}:${hashBuffer.toString('hex')}`;
}

async function runMigration() {
	if (!DATABASE_URL) {
		console.log('----------------------------------------------------');
		console.log('⚠️  DATABASE_URL environment variable is not defined.');
		console.log('To run migrations against a PostgreSQL database:');
		console.log('  1. Create a database (e.g. createdb placetrack)');
		console.log('  2. Set DATABASE_URL in your .env:');
		console.log('     DATABASE_URL=postgresql://username:password@localhost:5432/placetrack');
		console.log('  3. Run: npm run db:migrate');
		console.log('----------------------------------------------------');
		return;
	}

	console.log('Connecting to PostgreSQL database...');
	const sql = postgres(DATABASE_URL, { max: 1 });

	try {
		// Read schema.sql
		const schemaPath = path.resolve(__dirname, '../src/lib/server/db/schema.sql');
		const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

		console.log('Executing database schema migrations (schema.sql)...');
		await sql.unsafe(schemaSql);
		console.log('✓ Tables, enums, indices, and triggers created successfully.');

		// Seed initial users with secure scrypt hashes
		console.log('Seeding initial users with secure scrypt password hashes...');
		const defaultPassword = 'password123';

		const initialUsers = [
			{
				name: 'Alex Morgan',
				email: 'student@placetrack.ai',
				role: 'STUDENT',
				password_hash: hashPassword(defaultPassword)
			},
			{
				name: 'Prof. David Chen',
				email: 'trainer@placetrack.ai',
				role: 'TRAINER',
				password_hash: hashPassword(defaultPassword)
			},
			{
				name: 'Dr. Sarah Jenkins',
				email: 'coordinator@placetrack.ai',
				role: 'PLACEMENT_COORDINATOR',
				password_hash: hashPassword(defaultPassword)
			},
			{
				name: 'Rohan Sharma',
				email: 'rohan.sharma@placetrack.ai',
				role: 'STUDENT',
				password_hash: hashPassword(defaultPassword)
			},
			{
				name: 'Priya Patel',
				email: 'priya.patel@placetrack.ai',
				role: 'STUDENT',
				password_hash: hashPassword(defaultPassword)
			},
			{
				name: 'Karan Verma',
				email: 'karan.verma@placetrack.ai',
				role: 'STUDENT',
				password_hash: hashPassword(defaultPassword)
			},
			{
				name: 'Ananya Iyer',
				email: 'ananya.iyer@placetrack.ai',
				role: 'STUDENT',
				password_hash: hashPassword(defaultPassword)
			},
			{
				name: 'Siddharth Rao',
				email: 'siddharth.rao@placetrack.ai',
				role: 'STUDENT',
				password_hash: hashPassword(defaultPassword)
			}
		];

		for (const u of initialUsers) {
			await sql`
				INSERT INTO users (name, email, password_hash, role, is_active)
				VALUES (${u.name}, ${u.email}, ${u.password_hash}, ${u.role}, true)
				ON CONFLICT (email) DO UPDATE
				SET name = EXCLUDED.name,
				    password_hash = EXCLUDED.password_hash,
				    role = EXCLUDED.role,
				    is_active = true,
				    updated_at = CURRENT_TIMESTAMP
			`;
			console.log(`  ✓ Seeded user: ${u.email} [Role: ${u.role}]`);
		}

		// Seed student profiles
		const studentRecords = [
			{
				email: 'student@placetrack.ai',
				reg: '2022CS1042',
				dept: 'Computer Science and Engineering',
				cgpa: 8.84,
				readiness: 84,
				status: 'Placement Ready',
				p_status: 'Eligible',
				phone: '+91 98765 43210'
			},
			{
				email: 'rohan.sharma@placetrack.ai',
				reg: '2022CS1018',
				dept: 'Computer Science and Engineering',
				cgpa: 8.45,
				readiness: 79,
				status: 'Placement Ready',
				p_status: 'Eligible',
				phone: '+91 98111 22334'
			},
			{
				email: 'priya.patel@placetrack.ai',
				reg: '2022IT2045',
				dept: 'Information Technology',
				cgpa: 9.12,
				readiness: 91,
				status: 'Placement Ready',
				p_status: 'Eligible',
				phone: '+91 98222 33445'
			},
			{
				email: 'karan.verma@placetrack.ai',
				reg: '2022CS1088',
				dept: 'Computer Science and Engineering',
				cgpa: 7.65,
				readiness: 68,
				status: 'Needs Improvement',
				p_status: 'In Review',
				phone: '+91 98333 44556'
			},
			{
				email: 'ananya.iyer@placetrack.ai',
				reg: '2022EC3012',
				dept: 'Electronics and Communication',
				cgpa: 8.7,
				readiness: 82,
				status: 'Placement Ready',
				p_status: 'Eligible',
				phone: '+91 98444 55667'
			},
			{
				email: 'siddharth.rao@placetrack.ai',
				reg: '2022CS1077',
				dept: 'Computer Science and Engineering',
				cgpa: 8.1,
				readiness: 75,
				status: 'Placement Ready',
				p_status: 'Eligible',
				phone: '+91 98555 66778'
			}
		];

		for (const s of studentRecords) {
			const uRows = await sql`SELECT id FROM users WHERE email = ${s.email} LIMIT 1`;
			if (uRows.length > 0) {
				await sql`
					INSERT INTO students (
						user_id,
						register_number,
						department,
						course,
						year,
						batch,
						phone,
						cgpa,
						readiness_score,
						readiness_status,
						placement_status
					) VALUES (
						${uRows[0].id},
						${s.reg},
						${s.dept},
						'B.Tech',
						4,
						'2022-2026',
						${s.phone},
						${s.cgpa},
						${s.readiness},
						${s.status},
						${s.p_status}
					)
					ON CONFLICT (user_id) DO UPDATE
					SET register_number = EXCLUDED.register_number,
					    department = EXCLUDED.department,
					    cgpa = EXCLUDED.cgpa,
					    readiness_score = EXCLUDED.readiness_score,
					    readiness_status = EXCLUDED.readiness_status,
					    placement_status = EXCLUDED.placement_status,
					    updated_at = CURRENT_TIMESTAMP
				`;
			}
		}
		console.log('✓ Seeded students with readiness metrics.');

		// Seed Companies
		const companies = [
			{ name: 'TechCorp Systems', industry: 'Software / Cloud', tier: 'Tier-1' },
			{ name: 'Nexus Cloud Labs', industry: 'Cloud Engineering', tier: 'Tier-1' },
			{ name: 'Horizon Financial Tech', industry: 'FinTech / Quantitative', tier: 'Tier-1' },
			{ name: 'Apex Mobility AI', industry: 'Autonomous Systems', tier: 'Tier-1' },
			{ name: 'CyberShield InfoSec', industry: 'Cybersecurity', tier: 'Tier-2' },
			{ name: 'Quantum DataWorks', industry: 'Data Engineering', tier: 'Tier-1' }
		];

		const companyMap = {};
		for (const c of companies) {
			const rows = await sql`
				INSERT INTO companies (name, industry, tier, is_active)
				VALUES (${c.name}, ${c.industry}, ${c.tier}, true)
				ON CONFLICT (name) DO UPDATE
				SET industry = EXCLUDED.industry,
				    tier = EXCLUDED.tier
				RETURNING id, name
			`;
			companyMap[rows[0].name] = rows[0].id;
		}
		console.log('✓ Seeded partner recruiting companies.');

		// Seed Placement Drives
		const drives = [
			{
				company: 'TechCorp Systems',
				title: 'Software Development Engineer Drive 2026',
				role: 'Software Development Engineer (SDE-1)',
				ctc_display: '14 - 18 LPA',
				ctc_min: 14.0,
				ctc_max: 18.0,
				drive_date: '2026-10-04',
				status: 'Active',
				eligible_count: 142
			},
			{
				company: 'Nexus Cloud Labs',
				title: 'Associate Cloud Architect Recruitment',
				role: 'Associate Cloud Engineer',
				ctc_display: '12 - 15 LPA',
				ctc_min: 12.0,
				ctc_max: 15.0,
				drive_date: '2026-10-10',
				status: 'Active',
				eligible_count: 128
			},
			{
				company: 'Horizon Financial Tech',
				title: 'Quantitative Trading & FinTech Analyst',
				role: 'Quantitative & FinTech Analyst',
				ctc_display: '16 - 20 LPA',
				ctc_min: 16.0,
				ctc_max: 20.0,
				drive_date: '2026-10-18',
				status: 'Active',
				eligible_count: 88
			},
			{
				company: 'Apex Mobility AI',
				title: 'Autonomous Systems Trainee Drive',
				role: 'Machine Learning Trainee',
				ctc_display: '15 - 22 LPA',
				ctc_min: 15.0,
				ctc_max: 22.0,
				drive_date: '2026-10-25',
				status: 'Scheduled',
				eligible_count: 65
			},
			{
				company: 'CyberShield InfoSec',
				title: 'Security Operations & Pentest Drive',
				role: 'Security Operations Engineer',
				ctc_display: '10 - 14 LPA',
				ctc_min: 10.0,
				ctc_max: 14.0,
				drive_date: '2026-09-15',
				status: 'Completed',
				eligible_count: 94
			}
		];

		const driveMap = {};
		for (const d of drives) {
			const compId = companyMap[d.company];
			if (compId) {
				const dRows = await sql`
					INSERT INTO placement_drives (
						company_id,
						title,
						role,
						ctc_display,
						ctc_min,
						ctc_max,
						drive_date,
						status,
						eligible_count
					) VALUES (
						${compId},
						${d.title},
						${d.role},
						${d.ctc_display},
						${d.ctc_min},
						${d.ctc_max},
						${d.drive_date},
						${d.status},
						${d.eligible_count}
					)
					RETURNING id, role
				`;
				driveMap[d.company] = dRows[0].id;
			}
		}
		console.log('✓ Seeded placement drives.');

		// Seed Applications & Offers
		const studentList = await sql`SELECT id FROM students`;
		if (studentList.length > 0 && Object.keys(driveMap).length > 0) {
			for (let i = 0; i < studentList.length; i++) {
				const sId = studentList[i].id;
				const cName = Object.keys(driveMap)[i % Object.keys(driveMap).length];
				const dId = driveMap[cName];
				const compId = companyMap[cName];

				const appRows = await sql`
					INSERT INTO applications (drive_id, student_id, status)
					VALUES (${dId}, ${sId}, 'Offered')
					ON CONFLICT (drive_id, student_id) DO UPDATE SET status = 'Offered'
					RETURNING id
				`;

				if (appRows.length > 0 && i < 4) {
					const ctc = 12.0 + (i * 2.2);
					const dates = ['2026-07-15', '2026-08-20', '2026-09-14', '2026-10-02'];
					await sql`
						INSERT INTO placement_offers (
							application_id,
							student_id,
							drive_id,
							company_id,
							ctc_offered,
							offer_date,
							status
						) VALUES (
							${appRows[0].id},
							${sId},
							${dId},
							${compId},
							${ctc},
							${dates[i]},
							'Accepted'
						)
						ON CONFLICT DO NOTHING
					`;
				}
			}
			console.log('✓ Seeded student drive applications and offers.');
		}

		console.log('🎉 Migration and seeding completed successfully!');
	} catch (err) {
		console.error('❌ Migration failed:', err);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

runMigration();
