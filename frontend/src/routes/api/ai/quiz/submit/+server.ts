import { json, type RequestHandler } from '@sveltejs/kit';
import { evaluateCodingQuizAttempt, type QuizSubmissionPayload } from '$lib/server/services/aiCodingAssistant';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required to submit quiz attempts.' }, { status: 401 });
	}

	try {
		const payload: QuizSubmissionPayload = await request.json();

		if (!payload.quizId || !payload.answers) {
			return json({ error: 'BadRequest', message: 'Missing quizId or answers in submission payload.' }, { status: 400 });
		}

		const result = await evaluateCodingQuizAttempt(
			payload.quizId,
			payload.answers,
			payload.timeSpentSeconds || 0,
			{
				id: user.id,
				name: user.name
			}
		);

		return json({
			success: true,
			evaluation: result
		});
	} catch (err: any) {
		console.error('Error submitting AI quiz:', err);
		return json({ error: 'QuizEvaluationError', message: err.message || 'Failed to evaluate quiz submission.' }, { status: 500 });
	}
};
