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

async function seed() {
	console.log('Seeding 5 domain assessments into PostgreSQL...');

	// Find trainer
	const trainers = await sql`SELECT id FROM users WHERE role = 'TRAINER' LIMIT 1`;
	const trainerId = trainers.length > 0 ? trainers[0].id : null;

	const domainAssessments = [
		{
			title: 'Quantitative Aptitude: Time, Work & Relative Speed Drill',
			category: 'Aptitude',
			description: 'Fundamental quantitative speed and accuracy assessment covering time & work, pipes, and speed-distance formulas.',
			difficulty_level: 'Intermediate',
			duration_minutes: 15,
			questions: [
				{
					question_order: 1,
					question_text: 'A can finish a work in 12 days and B can finish it in 18 days. If they work together for 4 days, what fraction of work is completed?',
					option_a: '5/9',
					option_b: '1/3',
					option_c: '4/9',
					option_d: '2/3',
					correct_option: 'a',
					explanation: "A's 1 day = 1/12, B's 1 day = 1/18. Combined 1 day = 5/36. In 4 days: 4 × 5/36 = 20/36 = 5/9."
				},
				{
					question_order: 2,
					question_text: 'A train 180 meters long is traveling at 54 km/h. How many seconds will it take to pass a stationary signal pole?',
					option_a: '10 seconds',
					option_b: '12 seconds',
					option_c: '14 seconds',
					option_d: '16 seconds',
					correct_option: 'b',
					explanation: 'Speed in m/s = 54 × (5/18) = 15 m/s. Time = Distance / Speed = 180 / 15 = 12 seconds.'
				},
				{
					question_order: 3,
					question_text: 'If the selling price of 16 items is equal to the cost price of 20 items, what is the profit percentage?',
					option_a: '20%',
					option_b: '25%',
					option_c: '30%',
					option_d: '15%',
					correct_option: 'b',
					explanation: 'Profit % = [(CP of 20 - CP of 16) / CP of 16] × 100 = (4 / 16) × 100 = 25%.'
				},
				{
					question_order: 4,
					question_text: 'Pipe A can fill a tank in 6 hours and Pipe B can empty it in 8 hours. If both pipes are opened simultaneously, in how many hours will the tank be full?',
					option_a: '18 hours',
					option_b: '20 hours',
					option_c: '24 hours',
					option_d: '28 hours',
					correct_option: 'c',
					explanation: 'Net rate = 1/6 - 1/8 = 1/24. Therefore, the tank fills in 24 hours.'
				}
			]
		},
		{
			title: 'Verbal Ability: Sentence Correction & Critical Vocabulary',
			category: 'Verbal',
			description: 'Assesses error spotting, subject-verb agreement, idioms, and contextual vocabulary required by recruitment exams.',
			difficulty_level: 'Intermediate',
			duration_minutes: 15,
			questions: [
				{
					question_order: 1,
					question_text: 'Identify the grammatically correct sentence:',
					option_a: 'Neither the manager nor the employees was aware of the policy change.',
					option_b: 'Neither the manager nor the employees were aware of the policy change.',
					option_c: 'Neither the manager or the employees was aware of the policy change.',
					option_d: 'Neither the manager nor the employees is aware of the policy change.',
					correct_option: 'b',
					explanation: 'When subjects are connected by "neither... nor", the verb agrees with the closer subject ("employees" -> plural -> "were").'
				},
				{
					question_order: 2,
					question_text: 'Select the word most similar in meaning to PRAGMATIC:',
					option_a: 'Theoretical',
					option_b: 'Idealistic',
					option_c: 'Realistic / Practical',
					option_d: 'Dogmatic',
					correct_option: 'c',
					explanation: 'Pragmatic means dealing with things sensibly and realistically based on practical rather than theoretical considerations.'
				},
				{
					question_order: 3,
					question_text: 'Choose the correct preposition: "The candidate was absolved _______ all charges of misconduct."',
					option_a: 'with',
					option_b: 'from',
					option_c: 'of',
					option_d: 'to',
					correct_option: 'b',
					explanation: 'The verb "absolve" idiomatically pairs with "from" (or sometimes "of") - absolved from charges.'
				},
				{
					question_order: 4,
					question_text: 'Choose the antonym of LACONIC:',
					option_a: 'Terse',
					option_b: 'Verbose / Garrulous',
					option_c: 'Pithy',
					option_d: 'Succinct',
					correct_option: 'b',
					explanation: 'Laconic means using very few words. Verbose or garrulous means using or expressed in more words than needed.'
				}
			]
		},
		{
			title: 'Logical Reasoning: Syllogisms & Seating Arrangements',
			category: 'Logical Reasoning',
			description: 'Tests analytical deduction, circular seating puzzles, and deductive syllogisms typical of Tier-1 placement tests.',
			difficulty_level: 'Intermediate',
			duration_minutes: 20,
			questions: [
				{
					question_order: 1,
					question_text: 'Statements: (1) All laptops are computers. (2) Some computers are servers. Conclusions: I. Some laptops are servers. II. Some servers are computers.',
					option_a: 'Only conclusion I follows',
					option_b: 'Only conclusion II follows',
					option_c: 'Both I and II follow',
					option_d: 'Neither follows',
					correct_option: 'b',
					explanation: 'From (2) "Some computers are servers", the immediate converse "Some servers are computers" is always true (Conclusion II follows). Laptop and server overlap is not guaranteed.'
				},
				{
					question_order: 2,
					question_text: 'In a code, TEACHER is written as VGCEJGT. How will STUDENT be written in that code?',
					option_a: 'UVWFGPV',
					option_b: 'TVWFGPU',
					option_c: 'UWFHGPV',
					option_d: 'TVWGHOU',
					correct_option: 'a',
					explanation: 'Each letter is shifted by +2 (T->V, E->G, A->C, C->E, etc.). S->U, T->V, U->W, D->F, E->G, N->P, T->V.'
				},
				{
					question_order: 3,
					question_text: 'A is the father of B, but B is not the son of A. What is the relationship between B and A?',
					option_a: 'B is the nephew of A',
					option_b: 'B is the daughter of A',
					option_c: 'B is the brother of A',
					option_d: 'Cannot be determined',
					correct_option: 'b',
					explanation: 'If A is the father of B and B is not the son, B must be the daughter of A.'
				},
				{
					question_order: 4,
					question_text: 'Six persons A, B, C, D, E, F sit in a circle facing the center. A is opposite D. B is to the right of A and opposite E. Who is to the immediate left of D?',
					option_a: 'E',
					option_b: 'F',
					option_c: 'B',
					option_d: 'A',
					correct_option: 'a',
					explanation: 'Following the circular positions facing center: A is opposite D, B is to the right of A, E is opposite B (to the left of D).'
				}
			]
		},
		{
			title: 'Technical Core: DBMS, SQL & Algorithm Complexity',
			category: 'Technical',
			description: 'Core MCA technical screening on indexing, transactions (ACID), binary trees, and Big-O computational bounds.',
			difficulty_level: 'Advanced',
			duration_minutes: 20,
			questions: [
				{
					question_order: 1,
					question_text: 'Which SQL clause is executed FIRST in query processing order?',
					option_a: 'SELECT',
					option_b: 'WHERE',
					option_c: 'FROM',
					option_d: 'HAVING',
					correct_option: 'c',
					explanation: 'The logical processing order of an SQL query begins with FROM, followed by ON, JOIN, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, and ORDER BY.'
				},
				{
					question_order: 2,
					question_text: 'What is the worst-case time complexity of searching in a Balanced Binary Search Tree (AVL / Red-Black) with N nodes?',
					option_a: 'O(1)',
					option_b: 'O(log N)',
					option_c: 'O(N)',
					option_d: 'O(N log N)',
					correct_option: 'b',
					explanation: 'Because AVL and Red-Black trees maintain a maximum height of O(log N), search operations are guaranteed to complete in O(log N) worst-case time.'
				},
				{
					question_order: 3,
					question_text: 'In relational database transactions, which ACID property ensures that committed modifications survive system crashes or power failures?',
					option_a: 'Atomicity',
					option_b: 'Consistency',
					option_c: 'Isolation',
					option_d: 'Durability',
					correct_option: 'd',
					explanation: 'Durability guarantees that once a transaction has committed, it will remain committed even in the event of a power loss, crash, or errors via WAL logs.'
				},
				{
					question_order: 4,
					question_text: 'What data structure is utilized internally to implement the Call Stack in runtime engines for recursion?',
					option_a: 'Queue (FIFO)',
					option_b: 'Stack (LIFO)',
					option_c: 'Binary Heap',
					option_d: 'Hash Map',
					correct_option: 'b',
					explanation: 'A Last-In, First-Out (LIFO) stack data structure tracks active execution frames and return addresses during recursive function calls.'
				}
			]
		},
		{
			title: 'AI Assessment: Machine Learning & Deep Neural Foundations',
			category: 'AI',
			description: 'Tests machine learning fundamentals, overfitting remedies, gradient descent, and transformer attention mechanisms.',
			difficulty_level: 'Intermediate',
			duration_minutes: 15,
			questions: [
				{
					question_order: 1,
					question_text: 'Which technique is commonly used to prevent overfitting in deep neural networks by randomly deactivating neurons during training?',
					option_a: 'Batch Normalization',
					option_b: 'Dropout',
					option_c: 'Gradient Clipping',
					option_d: 'Softmax Activation',
					correct_option: 'b',
					explanation: 'Dropout randomly sets a fraction of input units to 0 at each update during training time, preventing co-adaptation of features and reducing overfitting.'
				},
				{
					question_order: 2,
					question_text: 'In supervised learning, what metric represents the harmonic mean of Precision and Recall?',
					option_a: 'ROC-AUC',
					option_b: 'Mean Squared Error',
					option_c: 'F1-Score',
					option_d: 'R-Squared',
					correct_option: 'c',
					explanation: 'The F1-score is defined as 2 * (Precision * Recall) / (Precision + Recall), giving balanced evaluation for imbalanced classification tasks.'
				},
				{
					question_order: 3,
					question_text: 'Which attention mechanism revolutionized NLP and forms the foundation of modern Large Language Models (LLMs)?',
					option_a: 'Convolutional Pooling',
					option_b: 'Recurrent Memory Gate',
					option_c: 'Multi-Head Self-Attention',
					option_d: 'Markov Decision Chain',
					correct_option: 'c',
					explanation: 'Multi-Head Self-Attention, introduced in the "Attention Is All You Need" paper, enables parallel computation of token dependencies across sequences.'
				},
				{
					question_order: 4,
					question_text: 'What is the role of an Activation Function such as ReLU in a neural network?',
					option_a: 'To normalize the weights to mean 0',
					option_b: 'To introduce non-linearity so the network can learn complex patterns',
					option_c: 'To calculate the gradient of the loss function',
					option_d: 'To reduce the dataset dimensionality',
					correct_option: 'b',
					explanation: 'Without non-linear activation functions, any multi-layer neural network collapses mathematically into an ordinary single-layer linear model.'
				}
			]
		}
	];

	for (const asm of domainAssessments) {
		const existing = await sql`SELECT id FROM assessments WHERE title = ${asm.title} LIMIT 1`;
		let asmId;
		if (existing.length > 0) {
			asmId = existing[0].id;
			await sql`
				UPDATE assessments
				SET category = ${asm.category},
				    description = ${asm.description},
				    difficulty_level = ${asm.difficulty_level},
				    duration_minutes = ${asm.duration_minutes},
				    total_questions = ${asm.questions.length},
				    status = 'Published',
				    target_type = 'all',
				    target_batch = 'All',
				    due_date = '2026-10-30 23:59:59+00'
				WHERE id = ${asmId}
			`;
			console.log(`Updated assessment: ${asm.title}`);
		} else {
			const inserted = await sql`
				INSERT INTO assessments (
					trainer_id,
					title,
					category,
					description,
					difficulty_level,
					duration_minutes,
					total_questions,
					status,
					target_type,
					target_batch,
					due_date
				) VALUES (
					${trainerId},
					${asm.title},
					${asm.category},
					${asm.description},
					${asm.difficulty_level},
					${asm.duration_minutes},
					${asm.questions.length},
					'Published',
					'all',
					'All',
					'2026-10-30 23:59:59+00'
				)
				RETURNING id
			`;
			asmId = inserted[0].id;
			console.log(`Created assessment: ${asm.title}`);
		}

		// Insert or replace questions
		await sql`DELETE FROM assessment_questions WHERE assessment_id = ${asmId}`;
		for (const q of asm.questions) {
			await sql`
				INSERT INTO assessment_questions (
					assessment_id,
					question_order,
					question_text,
					option_a,
					option_b,
					option_c,
					option_d,
					correct_option,
					explanation
				) VALUES (
					${asmId},
					${q.question_order},
					${q.question_text},
					${q.option_a},
					${q.option_b},
					${q.option_c},
					${q.option_d},
					${q.correct_option},
					${q.explanation}
				)
			`;
		}
	}

	console.log('✓ Successfully seeded assessments for all 5 domains!');

	// Now check students and seed representative attempts for Alex Morgan (student@placetrack.ai)
	// Matching user request example: Aptitude 85%, Verbal 52%, Logical 75%, Technical 90% -> Verbal is identified as weak area!
	const alexUser = await sql`SELECT id FROM users WHERE email = 'student@placetrack.ai' LIMIT 1`;
	if (alexUser.length > 0) {
		const studentRows = await sql`SELECT id FROM students WHERE user_id = ${alexUser[0].id} LIMIT 1`;
		if (studentRows.length > 0) {
			const studentId = studentRows[0].id;

			// Check if attempts already exist
			const existingAttempts = await sql`SELECT id FROM assessment_attempts WHERE student_id = ${studentId}`;
			if (existingAttempts.length === 0) {
				console.log('Seeding initial verified attempts for Alex Morgan to test 5 skill domains...');

				const asms = await sql`SELECT id, category, total_questions FROM assessments WHERE status = 'Published'`;
				const scoresByCat = {
					Aptitude: { score: 85, pct: 85, max: 100, correct: 17, total: 20 },
					Verbal: { score: 52, pct: 52, max: 100, correct: 10, total: 20 },
					'Logical Reasoning': { score: 75, pct: 75, max: 100, correct: 15, total: 20 },
					Technical: { score: 90, pct: 90, max: 100, correct: 18, total: 20 }
				};

				for (const a of asms) {
					const sc = scoresByCat[a.category];
					if (sc) {
						const dateOffset = a.category === 'Technical' ? 2 : a.category === 'Logical Reasoning' ? 5 : a.category === 'Verbal' ? 8 : 12;
						const submittedDate = new Date(Date.now() - dateOffset * 86400000);

						await sql`
							INSERT INTO assessment_attempts (
								assessment_id,
								student_id,
								started_at,
								submitted_at,
								total_questions,
								correct_answers,
								score,
								max_score,
								percentage,
								status,
								time_spent_seconds
							) VALUES (
								${a.id},
								${studentId},
								${new Date(submittedDate.getTime() - 900000)},
								${submittedDate},
								${sc.total},
								${sc.correct},
								${sc.score},
								${sc.max},
								${sc.pct},
								'Completed',
								820
							)
						`;
					}
				}
				console.log('✓ Seeded representative attempts for Aptitude (85%), Verbal (52%), Logical (75%), Technical (90%)!');
			}
		}
	}

	await sql.end();
}

seed().catch(async (err) => {
	console.error('Seed failed:', err);
	await sql.end();
	process.exit(1);
});
