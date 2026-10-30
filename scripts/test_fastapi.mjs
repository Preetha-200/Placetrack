const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';
const ML_SERVICE_SECRET = process.env.ML_SERVICE_SECRET || 'placetrack-internal-ml-secret-2026-prod-grade-key-x9';

async function check() {
	try {
		const res = await fetch(`${FASTAPI_URL}/health`);
		const json = await res.json();
		console.log('Health check:', json);

		const metricsRes = await fetch(`${FASTAPI_URL}/model-metrics`);
		const metrics = await metricsRes.json();
		console.log('Metrics from FastAPI:', metrics.best_algorithm, metrics.best_model_performance);

		const predRes = await fetch(`${FASTAPI_URL}/predict`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Internal-Service-Key': ML_SERVICE_SECRET
			},
			body: JSON.stringify({
				aptitude_score: 85,
				verbal_score: 52,
				logical_score: 75,
				technical_score: 90,
				completion_rate: 80,
				mock_interview_score: 80,
				historical_performance: 75.5,
				student_name: 'Alex Morgan'
			})
		});
		const pred = await predRes.json();
		console.log('Prediction for Alex:');
		console.log(' - Readiness Score:', pred.readiness_score);
		console.log(' - Readiness Category:', pred.readiness_category);
		console.log(' - Confidence:', pred.confidence_score + '%');
		console.log(' - Strongest Skills:', pred.strongest_skills);
		console.log(' - Weakest Skills:', pred.weakest_skills);
		console.log(' - Recommendations:', pred.recommendations);
		console.log(' - Suggested Assessments:', pred.suggested_assessments);
	} catch (e) {
		console.error('Error connecting to FastAPI:', e);
	}
}

check();
