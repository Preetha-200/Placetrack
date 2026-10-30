import { json, type RequestHandler } from '@sveltejs/kit';
import { processAssistantRequest, type AssistantRequestPayload } from '$lib/server/services/aiCodingAssistant';
import { checkRateLimit } from '$lib/server/utils/rateLimit';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required to access the AI assistant.' }, { status: 401 });
	}

	// Rate limiting: 30 requests per minute per user / IP
	const clientIp = (() => {
		try {
			return getClientAddress();
		} catch {
			return '127.0.0.1';
		}
	})();
	const rateLimitKey = `ai_assistant:${user.id || clientIp}`;
	const rateLimitCheck = checkRateLimit(rateLimitKey, 30, 60000);

	if (!rateLimitCheck.allowed) {
		return json(
			{
				error: 'RateLimitExceeded',
				message: `AI request rate limit reached. Please wait ${rateLimitCheck.retryAfterSeconds} seconds before sending another request.`
			},
			{ status: 429 }
		);
	}

	try {
		const payload: AssistantRequestPayload = await request.json();

		if (!payload.action) {
			return json({ error: 'BadRequest', message: 'Missing action in assistant request.' }, { status: 400 });
		}

		const response = await processAssistantRequest(payload, {
			id: user.id,
			name: user.name
		});

		return json(response);
	} catch (err: any) {
		console.error('Error in /api/ai/coding-assistant:', err);
		return json(
			{
				error: 'AssistantError',
				message: err.message || 'Failed to process AI assistant request.'
			},
			{ status: 500 }
		);
	}
};
