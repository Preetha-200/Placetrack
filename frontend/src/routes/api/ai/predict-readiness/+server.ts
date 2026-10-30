import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import {
	predictAndStoreStudentReadiness,
	getLatestStudentPrediction,
	getStoredEvaluationMetrics
} from '$lib/server/services/aiReadiness';
import { checkRateLimit } from '$lib/server/utils/rateLimit';

export const GET: RequestHandler = async ({ url, cookies, request, locals }) => {
	let user = locals.user;
	if (!user) {
		const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
		const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
		user = token ? await validateSessionToken(token) : null;
	}

	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	// Security: Students can NEVER access other students' readiness evaluations
	let targetStudentId = user.id;
	if (user.role === 'TRAINER' || user.role === 'PLACEMENT_COORDINATOR') {
		const paramStudentId = url.searchParams.get('studentId');
		if (paramStudentId) {
			targetStudentId = paramStudentId;
		}
	}

	try {
		const prediction = await getLatestStudentPrediction(targetStudentId);
		const metrics = getStoredEvaluationMetrics();

		return json({
			success: true,
			prediction,
			evaluationMetrics: metrics
		});
	} catch (err: any) {
		console.error('Error in predict-readiness GET:', err);
		return json({ error: 'EvaluationError', message: 'Failed to fetch AI placement readiness estimation' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	let user = locals.user;
	if (!user) {
		const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
		const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
		user = token ? await validateSessionToken(token) : null;
	}

	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	// Rate limiting: 15 prediction requests per minute per user
	const rateLimitCheck = checkRateLimit(`ai_predict:${user.id}`, 15, 60000);
	if (!rateLimitCheck.allowed) {
		return json(
			{
				error: 'RateLimitExceeded',
				message: `Readiness evaluation rate limit reached. Please wait ${rateLimitCheck.retryAfterSeconds} seconds before requesting again.`
			},
			{ status: 429 }
		);
	}

	let body: any = {};
	try {
		body = await request.json();
	} catch {
		body = {};
	}

	// Security: Students can NEVER run or alter other students' predictions
	let targetStudentId = user.id;
	if (user.role === 'TRAINER' || user.role === 'PLACEMENT_COORDINATOR') {
		if (body.studentId) {
			targetStudentId = body.studentId;
		}
	}

	try {
		const prediction = await predictAndStoreStudentReadiness(targetStudentId);
		const metrics = getStoredEvaluationMetrics();

		return json({
			success: true,
			prediction,
			evaluationMetrics: metrics
		});
	} catch (err: any) {
		console.error('Error in predict-readiness POST:', err);
		return json({ error: 'InferenceError', message: 'Failed to compute AI placement readiness estimation' }, { status: 500 });
	}
};
