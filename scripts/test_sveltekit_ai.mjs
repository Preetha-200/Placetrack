import postgres from 'postgres';

const sql = postgres('postgresql://postgres:1234@localhost:5432/placetrack');

async function verify() {
	try {
		console.log('Testing PostgreSQL AI prediction records and student updates...');
		
		// Find student Alex Morgan
		const students = await sql`
			SELECT s.id, s.register_number, s.readiness_score, s.readiness_status, u.name, u.email
			FROM students s
			JOIN users u ON s.user_id = u.id
			WHERE u.email = 'student@placetrack.ai'
		`;

		if (students.length === 0) {
			console.log('No student found with student@placetrack.ai');
			return;
		}

		const student = students[0];
		console.log('Found student:', student.name, 'ID:', student.id, 'Register:', student.register_number);
		console.log('Current DB Score:', student.readiness_score, 'Status:', student.readiness_status);

		// Check predictions table
		const predictions = await sql`
			SELECT *
			FROM student_ai_predictions
			WHERE student_id = ${student.id}
			ORDER BY created_at DESC
			LIMIT 1
		`;

		console.log('Stored AI Predictions count for student:', predictions.length);
		if (predictions.length > 0) {
			const p = predictions[0];
			console.log('Latest Prediction ID:', p.id);
			console.log(' - Model Algorithm:', p.model_algorithm);
			console.log(' - Readiness Score:', p.readiness_score);
			console.log(' - Readiness Category:', p.readiness_category);
			console.log(' - Confidence:', p.model_confidence);
			console.log(' - Strongest Skills:', p.strongest_skills);
			console.log(' - Weakest Skills:', p.weakest_skills);
			console.log(' - Recs Count:', Array.isArray(p.recommendations) ? p.recommendations.length : 0);
			console.log(' - Disclaimer:', p.disclaimer);
		}
	} catch (e) {
		console.error('Error during verification:', e);
	} finally {
		await sql.end();
	}
}

verify();
