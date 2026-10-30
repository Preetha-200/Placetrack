/**
 * MCA Placement Tracker - Master Seeding & Reconciliation Script
 * -------------------------------------------------------------
 * Exclusively seeds Master of Computer Applications (MCA) placement data:
 * - 55 Unique MCA Students across Batch 2024–2026 (45) & Batch 2023–2025 (10)
 *   * 32 Placement Ready students (Readiness Score >= 75)
 *   * 23 Students needing practice (Readiness Score < 75)
 *   * 16 Unique placed students
 * - 8 Partner Recruiting Companies (Tier-1 & Tier-2)
 * - 6 Campus Recruitment Drives (4 Active, 1 Scheduled, 1 Completed)
 * - 76 Student Applications (no duplicate drive applications per student)
 * - 25 Unique Shortlisted Candidates
 * - 18 Confirmed Placement Offers with realistic CTCs:
 *   * Peak CTC: 12.00 LPA
 *   * Average CTC: ~6.63 LPA
 *
 * Persists into BOTH Cloud Firestore (or local in-memory fallback) AND PostgreSQL!
 */

import { collections, getFirestoreDb } from '../src/lib/server/firebase/collections.ts';
import { Timestamp } from 'firebase-admin/firestore';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Load .env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
	const content = fs.readFileSync(envPath, 'utf8');
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
			const [key, ...values] = trimmed.split('=');
			const k = key.trim();
			const v = values.join('=').trim().replace(/^['"]|['"]$/g, '');
			if (!process.env[k]) {
				process.env[k] = v;
			}
		}
	}
}

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/placetrack';
let sql = null;
try {
	sql = postgres(DATABASE_URL, { max: 5, idle_timeout: 5, connect_timeout: 3 });
} catch (err) {
	console.warn('PostgreSQL client not initialized in seed script:', err.message);
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.PUBLIC_FIREBASE_PROJECT_ID || 'placetrack-placement';
const now = Timestamp.now();
const nowDate = new Date();

console.log('====================================================');
console.log('🚀 SEEDING MCA PLACEMENT TRACKER DATASET');
console.log(`📁 Project ID: ${projectId}`);
console.log(`🎯 Target Department: Master of Computer Applications (MCA)`);
console.log('====================================================\n');

// 55 Indian MCA Student Names
const STUDENT_NAMES = [
	'Alex Morgan', 'Rohan Sharma', 'Priya Patel', 'Karan Verma', 'Ananya Iyer',
	'Siddharth Rao', 'Aditi Nair', 'Vikram Sundaram', 'Neha Gupta', 'Rahul Nambiar',
	'Kavita Deshmukh', 'Arjun Menon', 'Divya Krishnan', 'Harish Kumar', 'Meera Swaminathan',
	'Karthik Rangarajan', 'Sneha Kulkarni', 'Pooja Hegde', 'Rajesh Kannan', 'Varun Joshi',
	'Deepa Balakrishnan', 'Sanjay Venkatesh', 'Shalini Reddy', 'Manoj Pillai', 'Swati Bhatt',
	'Aravind Natarajan', 'Lakshmi Narayanan', 'Preeti Mehra', 'Naveen Chandran', 'Shreya Banerjee',
	'Gautham Subramanian', 'Vidya Ramaswamy', 'Arvind Sethuraman', 'Ritu Agarwal', 'Tarun Varma',
	'Nithya Sundar', 'Chetan Bhagat', 'Gayathri Devi', 'Rohit Kulkarni', 'Bhavana Rao',
	'Pradeep Kumar', 'Soundarya Rajan', 'Ashwin Kumar', 'Lavanya Mohan', 'Dinesh Karthik',
	'Pavithra Srinivasan', 'Suresh Raina', 'Archana Murthy', 'Vigneshwaran S', 'Kausalya Raman',
	'Abishek Raghuram', 'Sandhya Venkataraman', 'Manikandan P', 'Keerthana Sekar', 'Gokulnath V'
];

// 8 Recruiting Companies
const COMPANIES_DATA = [
	{ id: 'cmp_tcs_01', name: 'TCS Digital', industry: 'IT Services & Consulting', tier: 'Tier-1', website: 'https://tcs.com/digital' },
	{ id: 'cmp_zoho_02', name: 'Zoho Corporation', industry: 'Enterprise SaaS & Cloud', tier: 'Tier-1', website: 'https://zoho.com' },
	{ id: 'cmp_infy_03', name: 'Infosys Specialist', industry: 'Digital Systems & Cloud', tier: 'Tier-1', website: 'https://infosys.com' },
	{ id: 'cmp_wipro_04', name: 'Wipro Turbo', industry: 'Cloud Engineering & AI', tier: 'Tier-2', website: 'https://wipro.com' },
	{ id: 'cmp_thought_05', name: 'Thoughtworks', industry: 'Software Consulting & DevOps', tier: 'Tier-1', website: 'https://thoughtworks.com' },
	{ id: 'cmp_cts_06', name: 'Cognizant GenC Next', industry: 'Enterprise Cloud & Data', tier: 'Tier-2', website: 'https://cognizant.com' },
	{ id: 'cmp_acc_07', name: 'Accenture Advanced Tech', industry: 'Technology Architecture', tier: 'Tier-2', website: 'https://accenture.com' },
	{ id: 'cmp_virtusa_08', name: 'Virtusa Technologies', industry: 'FinTech & Banking Solutions', tier: 'Tier-2', website: 'https://virtusa.com' }
];

// 6 Campus Drives (4 Active, 1 Scheduled, 1 Completed)
const DRIVES_DATA = [
	{
		id: 'drv_tcs_01',
		companyId: 'cmp_tcs_01',
		companyName: 'TCS Digital',
		title: 'TCS Digital MCA Campus Recruitment Drive 2026',
		role: 'Full-Stack Systems Engineer',
		ctcDisplay: '7.50 LPA',
		ctcMin: 7.50,
		ctcMax: 7.50,
		driveDate: '2026-11-15',
		applicationDeadline: '2026-11-10',
		status: 'Active',
		eligibleCount: 52
	},
	{
		id: 'drv_zoho_02',
		companyId: 'cmp_zoho_02',
		companyName: 'Zoho Corporation',
		title: 'Zoho Corporation Product Developer Drive 2026',
		role: 'Product Developer',
		ctcDisplay: '8.40 LPA',
		ctcMin: 8.40,
		ctcMax: 8.40,
		driveDate: '2026-11-20',
		applicationDeadline: '2026-11-16',
		status: 'Active',
		eligibleCount: 48
	},
	{
		id: 'drv_infy_03',
		companyId: 'cmp_infy_03',
		companyName: 'Infosys Specialist',
		title: 'Infosys Specialist Programmer Campus Drive 2026',
		role: 'Specialist Programmer',
		ctcDisplay: '9.50 LPA',
		ctcMin: 9.50,
		ctcMax: 9.50,
		driveDate: '2026-11-18',
		applicationDeadline: '2026-11-12',
		status: 'Active',
		eligibleCount: 45
	},
	{
		id: 'drv_wipro_04',
		companyId: 'cmp_wipro_04',
		companyName: 'Wipro Turbo',
		title: 'Wipro Turbo Cloud & Microservices Drive 2026',
		role: 'Cloud & Microservices Engineer',
		ctcDisplay: '6.50 LPA',
		ctcMin: 6.50,
		ctcMax: 6.50,
		driveDate: '2026-11-25',
		applicationDeadline: '2026-11-18',
		status: 'Active',
		eligibleCount: 50
	},
	{
		id: 'drv_thought_05',
		companyId: 'cmp_thought_05',
		companyName: 'Thoughtworks',
		title: 'Thoughtworks Premium SDE Campus Drive 2026',
		role: 'Application Developer',
		ctcDisplay: '12.00 LPA',
		ctcMin: 12.00,
		ctcMax: 12.00,
		driveDate: '2026-12-05',
		applicationDeadline: '2026-11-28',
		status: 'Scheduled',
		eligibleCount: 35
	},
	{
		id: 'drv_cts_06',
		companyId: 'cmp_cts_06',
		companyName: 'Cognizant GenC Next',
		title: 'Cognizant GenC Next MCA Recruitment Drive',
		role: 'GenC Next Associate',
		ctcDisplay: '6.75 LPA',
		ctcMin: 6.75,
		ctcMax: 6.75,
		driveDate: '2026-09-20',
		applicationDeadline: '2026-09-15',
		status: 'Completed',
		eligibleCount: 55
	}
];

// Helper to generate deterministic UUIDs from an index or key
function generateDeterministicUuid(key) {
	const hash = crypto.createHash('md5').update(`placetrack-mca-${key}`).digest('hex');
	return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

async function runSeed() {
	// 1. Coordinator and Trainer Accounts
	console.log('1. Seeding Coordinator and Trainer Accounts...');
	const coordinatorUid = 'usr_coordinator_01';
	const coordinatorUuid = generateDeterministicUuid('coordinator');
	const trainerUid = 'usr_trainer_01';
	const trainerUuid = generateDeterministicUuid('trainer');

	await collections.users().doc(coordinatorUid).set({
		uid: coordinatorUid,
		name: 'Dr. Sarah Jenkins',
		email: 'coordinator@placetrack.ai',
		role: 'PLACEMENT_COORDINATOR',
		department: 'Placement & Career Development Cell',
		isActive: true,
		createdAt: now,
		updatedAt: now
	}, { merge: true });

	await collections.users().doc(trainerUid).set({
		uid: trainerUid,
		name: 'Prof. David Chen',
		email: 'trainer@placetrack.ai',
		role: 'TRAINER',
		department: 'Master of Computer Applications (MCA)',
		isActive: true,
		createdAt: now,
		updatedAt: now
	}, { merge: true });

	if (sql) {
		try {
			await sql`
				INSERT INTO users (id, name, email, password_hash, role, is_active)
				VALUES (${coordinatorUuid}, 'Dr. Sarah Jenkins', 'coordinator@placetrack.ai', 'salt:hash', 'PLACEMENT_COORDINATOR', true)
				ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
			`;
			await sql`
				INSERT INTO users (id, name, email, password_hash, role, is_active)
				VALUES (${trainerUuid}, 'Prof. David Chen', 'trainer@placetrack.ai', 'salt:hash', 'TRAINER', true)
				ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
			`;
		} catch (e) {
			console.warn('PostgreSQL coordinator/trainer upsert notice:', e.message);
		}
	}

	// 2. Seed 55 MCA Students
	console.log('2. Seeding 55 MCA Students...');
	const studentsList = [];

	for (let i = 0; i < STUDENT_NAMES.length; i++) {
		const idx = i + 1;
		const name = STUDENT_NAMES[i];
		const uid = `usr_student_${String(idx).padStart(2, '0')}`;
		const uuid = generateDeterministicUuid(`student-${idx}`);
		
		// Batches: 1..45 in 2024-2026, 46..55 in 2023-2025
		const isPassoutBatch = idx > 45;
		const batchYear = isPassoutBatch ? '2023-2025' : '2024-2026';
		const batch = `MCA Batch ${batchYear}`;
		const year = isPassoutBatch ? 2 : 2;
		const regPrefix = isPassoutBatch ? '2023MCA1' : '2024MCA1';
		const regNumber = `${regPrefix}${String(idx).padStart(3, '0')}`;
		const email = idx === 1 ? 'student@placetrack.ai' : `student${idx}@mca.sona.edu`;

		// Readiness criteria: First 32 students are Placement Ready (>= 75 score)
		// Remaining 23 students are Needs Practice (< 75 score)
		const isReady = idx <= 32;
		const readinessScore = isReady ? (75 + ((idx * 7) % 20)) : (54 + ((idx * 5) % 19));
		const readinessStatus = isReady ? 'Placement Ready' : 'Needs Practice';

		// 16 Placed students (first 16 students get confirmed offers)
		const isPlaced = idx <= 16;
		const placementStatus = isPlaced ? 'Placed' : 'Eligible';

		const cgpa = Number((7.40 + ((idx * 0.17) % 2.10)).toFixed(2));

		const studentObj = {
			idx,
			uid,
			uuid,
			name,
			email,
			regNumber,
			batch,
			batchYear,
			year,
			cgpa,
			readinessScore,
			readinessStatus,
			placementStatus,
			department: 'Master of Computer Applications (MCA)',
			course: 'MCA'
		};
		studentsList.push(studentObj);

		// Write to Firestore
		await collections.users().doc(uid).set({
			uid,
			name,
			email,
			role: 'STUDENT',
			registerNumber: regNumber,
			department: 'Master of Computer Applications (MCA)',
			isActive: true,
			createdAt: now,
			updatedAt: now
		}, { merge: true });

		await collections.students().doc(uid).set({
			userId: uid,
			name,
			email,
			registerNumber: regNumber,
			department: 'Master of Computer Applications (MCA)',
			course: 'MCA',
			year,
			batch,
			phone: `+91 9840${String(10000 + idx).substring(1)}`,
			cgpa,
			readinessScore,
			readinessStatus,
			placementStatus,
			aptitudeScore: readinessScore,
			verbalScore: Math.min(100, readinessScore + 3),
			logicalScore: Math.max(50, readinessScore - 2),
			technicalScore: Math.min(100, readinessScore + 4),
			testsCompleted: isReady ? 6 : 2,
			attendanceRate: `${85 + (idx % 14)}%`,
			trainerNotes: isReady ? 'Excellent MCA programming fundamentals. Ready for Tier-1 drives.' : 'Needs practice on dynamic programming.',
			bio: `MCA Scholar (${batchYear}) specializing in Full-Stack Web Architecture`,
			targetRole: 'Software Engineer',
			targetCtc: '8 - 14 LPA',
			trainerId: trainerUid,
			createdAt: now,
			updatedAt: now
		}, { merge: true });

		// Sync to PostgreSQL if active
		if (sql) {
			try {
				await sql`
					INSERT INTO users (id, name, email, password_hash, role, is_active)
					VALUES (${uuid}, ${name}, ${email}, 'salt:hash', 'STUDENT', true)
					ON CONFLICT (email) DO UPDATE 
					SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
				`;

				const uRows = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
				const actualUserId = uRows.length > 0 ? uRows[0].id : uuid;
				studentObj.actualUserId = actualUserId;

				const sRows = await sql`SELECT id, user_id FROM students WHERE user_id = ${actualUserId} OR register_number = ${regNumber} LIMIT 1`;
				if (sRows.length > 0) {
					studentObj.actualStudentId = sRows[0].id;
					await sql`
						UPDATE students
						SET user_id = ${actualUserId},
						    register_number = ${regNumber},
						    department = 'Master of Computer Applications (MCA)',
						    course = 'MCA',
						    batch = ${batch},
						    year = ${year},
						    phone = ${`+91 9840${String(10000 + idx).substring(1)}`},
						    cgpa = ${cgpa},
						    readiness_score = ${readinessScore},
						    readiness_status = ${readinessStatus},
						    placement_status = ${placementStatus},
						    updated_at = CURRENT_TIMESTAMP
						WHERE id = ${sRows[0].id}
					`;
				} else {
					studentObj.actualStudentId = actualUserId;
					await sql`
						INSERT INTO students (id, user_id, register_number, department, course, year, batch, phone, cgpa, readiness_score, readiness_status, placement_status)
						VALUES (${actualUserId}, ${actualUserId}, ${regNumber}, 'Master of Computer Applications (MCA)', 'MCA', ${year}, ${batch}, ${`+91 9840${String(10000 + idx).substring(1)}`}, ${cgpa}, ${readinessScore}, ${readinessStatus}, ${placementStatus})
					`;
				}
			} catch (e) {
				console.warn(`PostgreSQL student ${regNumber} insert notice:`, e.message);
			}
		}
	}
	console.log(`✓ Seeded ${studentsList.length} MCA Student profiles.`);

	// 3. Seed Companies
	console.log('3. Seeding 8 Partner Companies...');
	for (const c of COMPANIES_DATA) {
		const compUuid = generateDeterministicUuid(c.id);
		await collections.companies().doc(c.id).set({
			id: c.id,
			name: c.name,
			industry: c.industry,
			tier: c.tier,
			website: c.website,
			location: 'Bangalore / Chennai, India',
			contactEmail: `careers@${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
			contactPhone: '+91 80 2345 6789',
			isActive: true,
			createdAt: now,
			updatedAt: now
		}, { merge: true });

		if (sql) {
			try {
				await sql`
					INSERT INTO companies (id, name, industry, tier, website, is_active)
					VALUES (${compUuid}, ${c.name}, ${c.industry}, ${c.tier}, ${c.website}, true)
					ON CONFLICT (name) DO UPDATE SET tier = EXCLUDED.tier, industry = EXCLUDED.industry, is_active = true
				`;
			} catch (e) {
				console.warn(`PostgreSQL company ${c.name} notice:`, e.message);
			}
		}
	}
	console.log(`✓ Seeded ${COMPANIES_DATA.length} Companies.`);

	// 4. Seed Drives
	console.log('4. Seeding Campus Placement Drives...');
	for (const d of DRIVES_DATA) {
		const driveUuid = generateDeterministicUuid(d.id);
		const compUuid = generateDeterministicUuid(d.companyId);

		await collections.placementDrives().doc(d.id).set({
			id: d.id,
			companyId: d.companyId,
			companyName: d.companyName,
			title: d.title,
			role: d.role,
			ctcDisplay: d.ctcDisplay,
			ctcMin: d.ctcMin,
			ctcMax: d.ctcMax,
			driveDate: d.driveDate,
			applicationDeadline: d.applicationDeadline,
			status: d.status,
			eligibleCount: d.eligibleCount,
			minCgpa: 7.0,
			minReadiness: 70,
			targetDepartments: ['Master of Computer Applications (MCA)'],
			targetBatches: ['2026', '2025'],
			skills: ['Java', 'SQL', 'Data Structures', 'REST APIs', 'Cloud Basics'],
			description: `${d.companyName} recruitment opportunity exclusively for MCA scholars.`,
			createdAt: now,
			updatedAt: now
		}, { merge: true });

		if (sql) {
			try {
				// Lookup company id from pg
				const compRows = await sql`SELECT id FROM companies WHERE name = ${d.companyName} LIMIT 1`;
				const actualCompId = compRows.length > 0 ? compRows[0].id : compUuid;

				await sql`
					INSERT INTO placement_drives (id, company_id, title, role, ctc_display, ctc_min, ctc_max, drive_date, status, eligible_count, min_cgpa, min_readiness, target_departments)
					VALUES (${driveUuid}, ${actualCompId}, ${d.title}, ${d.role}, ${d.ctcDisplay}, ${d.ctcMin}, ${d.ctcMax}, ${d.driveDate}, ${d.status}, ${d.eligibleCount}, 7.00, 70, ARRAY['Master of Computer Applications (MCA)'])
					ON CONFLICT (id) DO UPDATE
					SET title = EXCLUDED.title,
					    role = EXCLUDED.role,
					    ctc_display = EXCLUDED.ctc_display,
					    status = EXCLUDED.status,
					    drive_date = EXCLUDED.drive_date,
					    target_departments = ARRAY['Master of Computer Applications (MCA)']
				`;
			} catch (e) {
				console.warn(`PostgreSQL drive ${d.title} notice:`, e.message);
			}
		}
	}
	console.log(`✓ Seeded ${DRIVES_DATA.length} Campus Drives.`);

	// 5. Seed 76 Student Applications & Exactly 25 Shortlisted Candidates
	console.log('5. Seeding 76 Applications and 25 Shortlisted Candidates...');
	// We want 76 applications across the 6 drives from the 55 students.
	// 18 will be 'Selected' or 'Offered'
	// 12 'Technical Interview'
	// 8 'HR Interview'
	// 10 'Assessment'
	// 8 'Shortlisted'
	// 20 'Applied'
	// Exactly 25 unique students in the shortlisted stages (Selected/Offered/Interview/Assessment/Shortlisted)

	const applications = [];
	const assignedAppPairs = new Set();

	// First: Seed the 18 applications that correspond to confirmed offers
	// Students 1 to 16 receive offers (Students 1 and 3 receive 2 offers)
	const offerMappings = [
		{ studentIdx: 1, driveIdx: 2, ctc: 8.40 },  // Student 1 -> Zoho (8.40)
		{ studentIdx: 2, driveIdx: 1, ctc: 7.50 },  // Student 2 -> TCS (7.50)
		{ studentIdx: 3, driveIdx: 5, ctc: 12.00 }, // Student 3 -> Thoughtworks (12.00 - Peak!)
		{ studentIdx: 4, driveIdx: 3, ctc: 9.50 },  // Student 4 -> Infosys (9.50)
		{ studentIdx: 5, driveIdx: 4, ctc: 6.50 },  // Student 5 -> Wipro (6.50)
		{ studentIdx: 6, driveIdx: 6, ctc: 6.75 },  // Student 6 -> Cognizant (6.75)
		{ studentIdx: 7, driveIdx: 1, ctc: 7.00 },  // Student 7 -> TCS (7.00)
		{ studentIdx: 8, driveIdx: 3, ctc: 6.50 },  // Student 8 -> Infosys (6.50)
		{ studentIdx: 9, driveIdx: 4, ctc: 5.50 },  // Student 9 -> Wipro (5.50)
		{ studentIdx: 10, driveIdx: 4, ctc: 5.00 }, // Student 10 -> Wipro (5.00)
		{ studentIdx: 11, driveIdx: 1, ctc: 4.50 }, // Student 11 -> TCS (4.50)
		{ studentIdx: 12, driveIdx: 6, ctc: 5.25 }, // Student 12 -> Cognizant (5.25)
		{ studentIdx: 13, driveIdx: 1, ctc: 6.00 }, // Student 13 -> TCS (6.00)
		{ studentIdx: 14, driveIdx: 3, ctc: 7.00 }, // Student 14 -> Infosys (7.00)
		{ studentIdx: 15, driveIdx: 2, ctc: 7.20 }, // Student 15 -> Zoho (7.20)
		{ studentIdx: 16, driveIdx: 4, ctc: 4.80 }, // Student 16 -> Wipro (4.80)
		{ studentIdx: 1, driveIdx: 6, ctc: 6.50 },  // Student 1 -> Cognizant second offer (6.50)
		{ studentIdx: 3, driveIdx: 1, ctc: 7.50 }   // Student 3 -> TCS second offer (7.50)
	];

	for (let i = 0; i < offerMappings.length; i++) {
		const m = offerMappings[i];
		const student = studentsList[m.studentIdx - 1];
		const drive = DRIVES_DATA[m.driveIdx - 1];
		const appId = `app_mca_ofr_${String(i + 1).padStart(2, '0')}`;
		assignedAppPairs.add(`${drive.id}_${student.uid}`);

		applications.push({
			id: appId,
			driveId: drive.id,
			driveTitle: drive.title,
			studentId: student.uid,
			studentUuid: student.actualStudentId || student.actualUserId || student.uuid,
			studentName: student.name,
			studentReg: student.regNumber,
			department: 'Master of Computer Applications (MCA)',
			batch: student.batch,
			companyId: drive.companyId,
			companyName: drive.companyName,
			role: drive.role,
			status: 'Offered',
			ctcOffered: m.ctc,
			appliedAt: new Date(Date.now() - (35 - i) * 86400000)
		});
	}

	// 2. Next: 12 applications in 'Technical Interview' (Students 17 to 22)
	let appCount = 19;
	for (let sIdx = 17; sIdx <= 22; sIdx++) {
		const student = studentsList[sIdx - 1];
		for (const dIdx of [1, 2]) {
			const drive = DRIVES_DATA[dIdx - 1];
			const pair = `${drive.id}_${student.uid}`;
			if (!assignedAppPairs.has(pair)) {
				assignedAppPairs.add(pair);
				applications.push({
					id: `app_mca_${String(appCount++).padStart(3, '0')}`,
					driveId: drive.id,
					driveTitle: drive.title,
					studentId: student.uid,
					studentUuid: student.actualStudentId || student.actualUserId || student.uuid,
					studentName: student.name,
					studentReg: student.regNumber,
					department: 'Master of Computer Applications (MCA)',
					batch: student.batch,
					companyId: drive.companyId,
					companyName: drive.companyName,
					role: drive.role,
					status: 'Technical Interview',
					appliedAt: new Date(Date.now() - (20 - sIdx) * 86400000)
				});
			}
		}
	}

	// 3. Next: 8 applications in 'HR Interview' (Students 23 to 25 + 2 already shortlisted)
	for (let sIdx = 23; sIdx <= 25; sIdx++) {
		const student = studentsList[sIdx - 1];
		for (const dIdx of [3, 4]) {
			const drive = DRIVES_DATA[dIdx - 1];
			const pair = `${drive.id}_${student.uid}`;
			if (!assignedAppPairs.has(pair)) {
				assignedAppPairs.add(pair);
				applications.push({
					id: `app_mca_${String(appCount++).padStart(3, '0')}`,
					driveId: drive.id,
					driveTitle: drive.title,
					studentId: student.uid,
					studentUuid: student.actualStudentId || student.actualUserId || student.uuid,
					studentName: student.name,
					studentReg: student.regNumber,
					department: 'Master of Computer Applications (MCA)',
					batch: student.batch,
					companyId: drive.companyId,
					companyName: drive.companyName,
					role: drive.role,
					status: 'HR Interview',
					appliedAt: new Date(Date.now() - (15 - sIdx) * 86400000)
				});
			}
		}
	}

	// 4. Next: 10 in 'Assessment' (from students 1 to 25 only to ensure exactly 25 shortlisted candidates!)
	for (let sIdx = 1; sIdx <= 10; sIdx++) {
		const student = studentsList[sIdx - 1];
		const drive = DRIVES_DATA[3]; // drive 4
		const pair = `${drive.id}_${student.uid}`;
		if (!assignedAppPairs.has(pair)) {
			assignedAppPairs.add(pair);
			applications.push({
				id: `app_mca_${String(appCount++).padStart(3, '0')}`,
				driveId: drive.id,
				driveTitle: drive.title,
				studentId: student.uid,
				studentUuid: student.actualStudentId || student.actualUserId || student.uuid,
				studentName: student.name,
				studentReg: student.regNumber,
				department: 'Master of Computer Applications (MCA)',
				batch: student.batch,
				companyId: drive.companyId,
				companyName: drive.companyName,
				role: drive.role,
				status: 'Assessment',
				appliedAt: new Date(Date.now() - (12 - sIdx) * 86400000)
			});
		}
	}

	// 5. Next: 8 in 'Shortlisted' (from students 11 to 18 only)
	for (let sIdx = 11; sIdx <= 18; sIdx++) {
		const student = studentsList[sIdx - 1];
		const drive = DRIVES_DATA[2]; // drive 3
		const pair = `${drive.id}_${student.uid}`;
		if (!assignedAppPairs.has(pair)) {
			assignedAppPairs.add(pair);
			applications.push({
				id: `app_mca_${String(appCount++).padStart(3, '0')}`,
				driveId: drive.id,
				driveTitle: drive.title,
				studentId: student.uid,
				studentUuid: student.actualStudentId || student.actualUserId || student.uuid,
				studentName: student.name,
				studentReg: student.regNumber,
				department: 'Master of Computer Applications (MCA)',
				batch: student.batch,
				companyId: drive.companyId,
				companyName: drive.companyName,
				role: drive.role,
				status: 'Shortlisted',
				appliedAt: new Date(Date.now() - 5 * 86400000)
			});
		}
	}

	// 6. Remaining applications: in 'Applied' status from remaining students (sIdx >= 26) up to 76 total
	for (let sIdx = 26; applications.length < 76 && sIdx <= 55; sIdx++) {
		const student = studentsList[sIdx - 1];
		for (let dIdx = 1; dIdx <= 4; dIdx++) {
			if (applications.length >= 76) break;
			const drive = DRIVES_DATA[dIdx - 1];
			const pair = `${drive.id}_${student.uid}`;
			if (!assignedAppPairs.has(pair)) {
				assignedAppPairs.add(pair);
				applications.push({
					id: `app_mca_${String(appCount++).padStart(3, '0')}`,
					driveId: drive.id,
					driveTitle: drive.title,
					studentId: student.uid,
					studentUuid: student.actualStudentId || student.actualUserId || student.uuid,
					studentName: student.name,
					studentReg: student.regNumber,
					department: 'Master of Computer Applications (MCA)',
					batch: student.batch,
					companyId: drive.companyId,
					companyName: drive.companyName,
					role: drive.role,
					status: 'Applied',
					appliedAt: new Date(Date.now() - (sIdx % 7) * 86400000)
				});
			}
		}
	}

	// Write applications to Firestore and PostgreSQL
	for (const a of applications) {
		const appUuid = generateDeterministicUuid(a.id);
		const driveUuid = generateDeterministicUuid(a.driveId);

		await collections.applications().doc(a.id).set({
			id: a.id,
			driveId: a.driveId,
			studentId: a.studentId,
			studentName: a.studentName,
			studentReg: a.studentReg,
			department: a.department,
			batch: a.batch,
			companyId: a.companyId,
			companyName: a.companyName,
			role: a.role,
			status: a.status,
			appliedAt: Timestamp.fromDate(a.appliedAt),
			updatedAt: now
		}, { merge: true });

		if (sql) {
			try {
				const appRows = await sql`SELECT id FROM applications WHERE drive_id = ${driveUuid} AND student_id = ${a.studentUuid} LIMIT 1`;
				if (appRows.length > 0) {
					a.actualAppId = appRows[0].id;
					await sql`
						UPDATE applications
						SET status = ${a.status}, updated_at = CURRENT_TIMESTAMP
						WHERE id = ${appRows[0].id}
					`;
				} else {
					a.actualAppId = appUuid;
					await sql`
						INSERT INTO applications (id, drive_id, student_id, status, applied_at, updated_at)
						VALUES (${appUuid}, ${driveUuid}, ${a.studentUuid}, ${a.status}, ${a.appliedAt}, CURRENT_TIMESTAMP)
					`;
				}
			} catch (e) {
				console.warn(`PostgreSQL app notice:`, e.message);
			}
		}
	}
	console.log(`✓ Seeded ${applications.length} Student Applications.`);

	// 6. Seed 18 Confirmed Placement Offers
	console.log('6. Seeding 18 Confirmed Placement Offers...');
	let offerSum = 0;
	let peakCtc = 0;

	for (let i = 0; i < offerMappings.length; i++) {
		const m = offerMappings[i];
		const app = applications[i]; // corresponds to the first 18 applications
		const offerId = `ofr_mca_${String(i + 1).padStart(2, '0')}`;
		const offerUuid = generateDeterministicUuid(offerId);
		const appUuid = generateDeterministicUuid(app.id);
		const driveUuid = generateDeterministicUuid(app.driveId);
		const compUuid = generateDeterministicUuid(app.companyId);

		const offerDate = new Date(Date.now() - (25 - i) * 86400000).toISOString().split('T')[0];
		offerSum += m.ctc;
		if (m.ctc > peakCtc) peakCtc = m.ctc;

		await collections.placementOffers().doc(offerId).set({
			id: offerId,
			applicationId: app.id,
			studentId: app.studentId,
			studentName: app.studentName,
			studentReg: app.studentReg,
			department: 'Master of Computer Applications (MCA)',
			batch: app.batch,
			companyId: app.companyId,
			companyName: app.companyName,
			driveId: app.driveId,
			role: app.role,
			ctcOffered: m.ctc,
			offerDate,
			status: 'Accepted',
			createdAt: now
		}, { merge: true });

		if (sql) {
			try {
				const compRows = await sql`SELECT id FROM companies WHERE name = ${app.companyName} LIMIT 1`;
				const actualCompId = compRows.length > 0 ? compRows[0].id : compUuid;

				const targetAppId = app.actualAppId || (appRow.length > 0 ? appRow[0].id : appUuid);

				await sql`
					INSERT INTO placement_offers (id, application_id, student_id, drive_id, company_id, ctc_offered, offer_date, status)
					VALUES (${offerUuid}, ${targetAppId}, ${app.studentUuid}, ${driveUuid}, ${actualCompId}, ${m.ctc}, ${offerDate}, 'Accepted')
					ON CONFLICT (id) DO UPDATE
					SET ctc_offered = EXCLUDED.ctc_offered, status = 'Accepted', offer_date = EXCLUDED.offer_date, application_id = EXCLUDED.application_id
				`;
			} catch (e) {
				console.warn(`PostgreSQL offer ${offerId} notice:`, e.message);
			}
		}
	}

	const avgCtc = Number((offerSum / offerMappings.length).toFixed(2));
	console.log(`✓ Seeded ${offerMappings.length} Confirmed Offers (Average CTC: ${avgCtc} LPA, Peak: ${peakCtc.toFixed(2)} LPA).`);

	// 7. Tasks & Study Materials
	console.log('7. Seeding Tasks & Study Materials for MCA...');
	const tasks = [
		{ id: 'tsk_mca_01', title: 'Quantitative Speed Math: Time & Work Fundamentals', category: 'aptitude', priority: 'High', status: 'Completed' },
		{ id: 'tsk_mca_02', title: 'Dynamic Programming & Graph Traversal Speed Drill', category: 'technical', priority: 'High', status: 'Completed' },
		{ id: 'tsk_mca_03', title: 'Logical Deduction & Circular Seating Matrix Practice', category: 'logical', priority: 'High', status: 'Submitted' },
		{ id: 'tsk_mca_04', title: 'Corporate Verbal Proficiency: Editorial Reading & Error Spotting', category: 'verbal', priority: 'Medium', status: 'Pending' }
	];
	for (const t of tasks) {
		await collections.tasks().doc(t.id).set({
			id: t.id,
			trainerId: trainerUid,
			trainerName: 'Prof. David Chen',
			trainerEmail: 'trainer@placetrack.ai',
			studentId: 'all',
			targetBatch: 'MCA Batch 2024-2026',
			title: t.title,
			description: 'Comprehensive practice drill for upcoming campus placement tests.',
			category: t.category,
			priority: t.priority,
			dueDate: '2026-11-01',
			status: t.status,
			createdAt: now,
			updatedAt: now
		}, { merge: true });
	}

	console.log('\n====================================================');
	console.log('🎉 MCA PLACEMENT TRACKER SEEDING COMPLETED!');
	console.log('====================================================');
	console.log(`• Total Registered MCA Students: ${studentsList.length}`);
	console.log(`• Placement Ready Students:     32 (~58%)`);
	console.log(`• Confirmed Corporate Offers:   ${offerMappings.length}`);
	console.log(`• Average Compensation:        ${avgCtc} LPA`);
	console.log(`• Peak Compensation:           ${peakCtc.toFixed(2)} LPA`);
	console.log(`• Partner Companies:           ${COMPANIES_DATA.length}`);
	console.log(`• Active Campus Drives:         4`);
	console.log(`• Student Applications:         ${applications.length}`);
	console.log(`• Shortlisted Candidates:       25 unique students`);
	console.log('====================================================\n');
}

runSeed().then(() => {
	if (sql) sql.end({ timeout: 2 });
	process.exit(0);
}).catch((err) => {
	console.error('Fatal seed failure:', err);
	if (sql) sql.end({ timeout: 2 });
	process.exit(1);
});
