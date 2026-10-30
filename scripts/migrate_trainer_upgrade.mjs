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

async function upgrade() {
	console.log('Starting Trainer Dashboard database upgrade...');

	// 1. Schema Alterations
	console.log('Applying schema enhancements...');
	await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES users(id) ON DELETE SET NULL;`;
	await sql`CREATE INDEX IF NOT EXISTS idx_students_trainer_id ON students (trainer_id);`;

	await sql`ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS file_path VARCHAR(500);`;
	await sql`ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS subject VARCHAR(100);`;
	await sql`ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS skill VARCHAR(100);`;

	// 2. Fetch Trainer User
	const [trainer] = await sql`SELECT id, name, email FROM users WHERE role = 'TRAINER' LIMIT 1`;
	if (!trainer) {
		throw new Error('Trainer user not found in database');
	}
	console.log(`Found trainer: ${trainer.name} (${trainer.email}) [ID: ${trainer.id}]`);

	// 3. Assign students to trainer
	await sql`
		UPDATE students 
		SET trainer_id = ${trainer.id}
		WHERE trainer_id IS NULL
	`;
	console.log('Assigned existing students to trainer.');

	// 4. Create uploads directory on disk
	const uploadDir = path.resolve(__dirname, '../static/uploads/materials');
	if (!fs.existsSync(uploadDir)) {
		fs.mkdirSync(uploadDir, { recursive: true });
	}

	// Create real sample files for PDF, DOCX, PPTX
	const samplePdfContent = `%PDF-1.4
1 0 obj
<< /Title (Quantitative Aptitude Master Handbook) /Author (Prof. David Chen) /Subject (Quantitative Aptitude) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 200 >>
stream
BT
/F1 24 Tf
50 700 Td
(PlaceTrack AI - MCA Placement Quantitative Aptitude Handbook) Tj
0 -40 Td
/F1 14 Tf
(Faculty: Prof. David Chen | Dept of Computer Applications) Tj
0 -30 Td
(Speed Math, Time & Work, Speed-Distance, and Probability formulas for campus drives.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000115 00000 n
0000000168 00000 n
0000000227 00000 n
0000000320 00000 n
trailer
<< /Size 6 /Root 2 0 R /Info 1 0 R >>
startxref
570
%%EOF`;

	const sampleDocxContent = `PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00PlaceTrack AI System Design and DSA Interview Guide 2026. Prepared by Prof. David Chen. Covers Trees, Dynamic Programming, System Architecture, Microservices, and High-Throughput Database Design for Tier-1 Tech drives.`;
	const samplePptxContent = `PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00PlaceTrack AI Campus Placement Master Slides: Corporate Soft Skills, HR Interviews, Technical Presentation & Behavioral Question Framework (STAR Method). Prepared by Prof. David Chen.`;

	const file1Name = 'MCA_Placement_Quantitative_Aptitude_Handbook_2026.pdf';
	const file2Name = 'System_Design_and_DSA_Interview_Guide_2026.docx';
	const file3Name = 'Corporate_Soft_Skills_and_HR_Interview_Prep.pptx';

	fs.writeFileSync(path.join(uploadDir, file1Name), samplePdfContent, 'utf-8');
	fs.writeFileSync(path.join(uploadDir, file2Name), sampleDocxContent, 'utf-8');
	fs.writeFileSync(path.join(uploadDir, file3Name), samplePptxContent, 'utf-8');
	console.log('Created sample PDF, DOCX, and PPTX files in static/uploads/materials/');

	// 5. Seed Study Materials into PostgreSQL with file_path (NO large base64!)
	const materialsData = [
		{
			title: 'Quantitative Aptitude Master Formula Handbook & Shortcut Guide',
			description: 'Essential formulas and speed math shortcuts for Time & Work, Speed, P&C, and Probability.',
			category: 'aptitude',
			category_label: 'Quantitative Aptitude',
			subject: 'Quantitative Mathematics',
			skill: 'Speed Math & Arithmetic',
			target_batch: 'All Batches',
			target_student_id: 'all',
			file_name: file1Name,
			file_type: 'pdf',
			mime_type: 'application/pdf',
			file_size: Buffer.byteLength(samplePdfContent),
			file_size_formatted: '1.8 MB',
			file_path: `/uploads/materials/${file1Name}`,
			preview_text: 'Section 1: Time & Work. Section 2: Relative Speed. Section 3: Permutations & Combinations.',
			downloads_count: 54,
			tags: ['Aptitude', 'Formulas', 'Speed-Math'],
			importance: 'High'
		},
		{
			title: 'System Design & Full-Stack DSA Interview Blueprint',
			description: 'Comprehensive guide covering Tree Traversals, Dynamic Programming patterns, and Distributed Architecture.',
			category: 'technical',
			category_label: 'Technical & Coding (DSA)',
			subject: 'Data Structures & Algorithms',
			skill: 'System Design & DSA',
			target_batch: 'All Batches',
			target_student_id: 'all',
			file_name: file2Name,
			file_type: 'doc',
			mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			file_size: Buffer.byteLength(sampleDocxContent),
			file_size_formatted: '2.4 MB',
			file_path: `/uploads/materials/${file2Name}`,
			preview_text: 'Complete interview blueprint for SDE-1 software roles covering graphs, DP, caching, and scalable architecture.',
			downloads_count: 89,
			tags: ['DSA', 'System-Design', 'Tech-Interview'],
			importance: 'High'
		},
		{
			title: 'Corporate Soft Skills & Behavioral Interview Deck',
			description: 'Presentation deck with STAR technique frameworks, body language tips, and corporate HR answers.',
			category: 'interview_prep',
			category_label: 'Interview & Resume Prep',
			subject: 'Professional Communication',
			skill: 'Behavioral & HR Skills',
			target_batch: 'All Batches',
			target_student_id: 'all',
			file_name: file3Name,
			file_type: 'doc',
			mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			file_size: Buffer.byteLength(samplePptxContent),
			file_size_formatted: '3.1 MB',
			file_path: `/uploads/materials/${file3Name}`,
			preview_text: 'Master the STAR method for behavioral rounds. Learn how to highlight teamwork, leadership, and conflict resolution.',
			downloads_count: 42,
			tags: ['HR-Round', 'Soft-Skills', 'Slides'],
			importance: 'Normal'
		}
	];

	for (const m of materialsData) {
		await sql`
			INSERT INTO study_materials (
				title, description, category, category_label, subject, skill, target_batch, target_student_id,
				file_name, file_type, mime_type, file_size, file_size_formatted, file_path,
				preview_text, uploaded_by_id, uploaded_by_name, uploaded_by_email, downloads_count, tags, importance
			) VALUES (
				${m.title}, ${m.description}, ${m.category}, ${m.category_label}, ${m.subject}, ${m.skill},
				${m.target_batch}, ${m.target_student_id}, ${m.file_name}, ${m.file_type}, ${m.mime_type},
				${m.file_size}, ${m.file_size_formatted}, ${m.file_path}, ${m.preview_text},
				${trainer.id}, ${trainer.name}, ${trainer.email}, ${m.downloads_count}, ${m.tags}, ${m.importance}
			)
			ON CONFLICT DO NOTHING
		`;
	}
	console.log('Seeded study materials into PostgreSQL.');

	// 6. Seed Trainer Tasks into PostgreSQL
	const students = await sql`SELECT id, user_id FROM students`;
	const alexStudent = students[0];
	const karanStudent = students.find((_, idx) => idx === 3) || students[1];

	const initialTasks = [
		{
			trainer_id: trainer.id,
			student_id: alexStudent?.id || null,
			target_batch: 'All',
			title: 'Dynamic Programming & Graph Traversal Speed Drill',
			description: 'Solve 5 medium-hard problems on 0/1 Knapsack, Longest Common Subsequence, and Dijkstra shortest path.',
			category: 'technical',
			category_label: 'Technical DSA',
			priority: 'High',
			due_date: 'Tomorrow, 11:59 PM',
			due_status: 'upcoming',
			status: 'Completed',
			submission_date: '2026-10-04 18:30',
			score: '94/100',
			trainer_feedback: 'Outstanding optimal solutions and clean space complexity analysis.',
			target_module_url: '/student/aptitude'
		},
		{
			trainer_id: trainer.id,
			student_id: karanStudent?.id || null,
			target_batch: 'All',
			title: 'Quantitative Speed Math: Time & Work Fundamentals',
			description: 'Complete 25 practice questions using the unitary LCM method and reciprocal shortcuts.',
			category: 'aptitude',
			category_label: 'Quantitative Aptitude',
			priority: 'High',
			due_date: 'Oct 08, 2026',
			due_status: 'upcoming',
			status: 'Pending',
			submission_date: null,
			score: null,
			trainer_feedback: 'Needs to review unitary LCM calculations to improve speed.',
			target_module_url: '/student/aptitude'
		},
		{
			trainer_id: trainer.id,
			student_id: null,
			target_batch: 'All',
			title: 'Corporate Verbal Proficiency: Editorial Reading & Error Spotting',
			description: 'Analyze 3 business editorial articles and complete the 20-question sentence correction drill.',
			category: 'verbal',
			category_label: 'Verbal Ability',
			priority: 'Medium',
			due_date: 'Oct 10, 2026',
			due_status: 'upcoming',
			status: 'Pending',
			submission_date: null,
			score: null,
			trainer_feedback: null,
			target_module_url: '/student/verbal'
		},
		{
			trainer_id: trainer.id,
			student_id: alexStudent?.id || null,
			target_batch: 'All',
			title: 'Logical Deduction & Circular Seating Matrix Practice',
			description: 'Solve 4 circular arrangement sets with inward/outward facing conditions within 30 minutes.',
			category: 'logical',
			category_label: 'Logical Reasoning',
			priority: 'High',
			due_date: 'Oct 06, 2026',
			due_status: 'upcoming',
			status: 'Submitted',
			submission_date: '2026-10-05 09:15',
			score: 'In Review',
			trainer_feedback: 'Submission received. Currently being evaluated for time efficiency.',
			target_module_url: '/student/logical-reasoning'
		}
	];

	for (const t of initialTasks) {
		await sql`
			INSERT INTO trainer_tasks (
				trainer_id, student_id, target_batch, title, description, category, category_label,
				priority, due_date, due_status, status, submission_date, score, trainer_feedback, target_module_url
			) VALUES (
				${t.trainer_id}, ${t.student_id}, ${t.target_batch}, ${t.title}, ${t.description},
				${t.category}, ${t.category_label}, ${t.priority}, ${t.due_date}, ${t.due_status},
				${t.status}, ${t.submission_date}, ${t.score}, ${t.trainer_feedback}, ${t.target_module_url}
			)
		`;
	}
	console.log('Seeded trainer tasks into PostgreSQL.');

	console.log('Trainer upgrade migration completed successfully!');
	await sql.end();
}

upgrade().catch(async (err) => {
	console.error('Upgrade failed:', err);
	await sql.end();
	process.exit(1);
});
