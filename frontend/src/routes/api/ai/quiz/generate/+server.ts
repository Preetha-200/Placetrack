import { json, type RequestHandler } from '@sveltejs/kit';
import { generateCodingQuiz, type QuizGenerationParams } from '$lib/server/services/aiCodingAssistant';
import { checkRateLimit } from '$lib/server/utils/rateLimit';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required to generate quizzes.' }, { status: 401 });
	}

	const clientIp = (() => {
		try {
			return getClientAddress();
		} catch {
			return '127.0.0.1';
		}
	})();
	const rateLimitKey = `ai_quiz_gen:${user.id || clientIp}`;
	const rateLimitCheck = checkRateLimit(rateLimitKey, 15, 60000); // 15 generations per minute max

	if (!rateLimitCheck.allowed) {
		return json(
			{
				error: 'RateLimitExceeded',
				message: `Quiz generation limit reached. Please wait ${rateLimitCheck.retryAfterSeconds} seconds before generating a new quiz.`
			},
			{ status: 429 }
		);
	}

	try {
		const body = await request.json();
		const { language = 'python', topic = 'Variables & Loops', difficulty = 'Medium', weakTopics = [], count = 5 } = body;

		const result = await generateCodingQuiz({
			language,
			topic,
			difficulty,
			weakTopics,
			count
		});

		// Return client safe response: NO answer keys or hidden test cases
		return json({
			success: true,
			quizId: result.quizId,
			title: result.title,
			topic: result.topic,
			language: result.language,
			difficulty: result.difficulty,
			questionCount: result.questionCount,
			questions: result.clientSafeQuestions
		});
	} catch (err: any) {
		console.error('Error generating AI quiz:', err);
		return json({ error: 'QuizGenerationError', message: err.message || 'Failed to generate coding quiz.' }, { status: 500 });
	}
};
