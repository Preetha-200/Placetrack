import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSessionToken, AUTH_COOKIE_NAME } from '$lib/server/auth';
import { executeCodeInSandbox } from '$lib/server/services/codeExecution';
import { checkRateLimit } from '$lib/server/utils/rateLimit';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	let user = locals.user;
	if (!user) {
		const authHeader = request.headers.get('authorization');
		const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookies.get(AUTH_COOKIE_NAME);
		if (token) {
			user = await validateSessionToken(token);
		}
	}

	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required to execute code' }, { status: 401 });
	}

	// Rate limiting: 15 code executions per minute per user
	const rateLimitCheck = checkRateLimit(`code_run:${user.id}`, 15, 60000);
	if (!rateLimitCheck.allowed) {
		return json(
			{
				error: 'RateLimitExceeded',
				message: `Code execution rate limit reached. Please wait ${rateLimitCheck.retryAfterSeconds} seconds before running again.`
			},
			{ status: 429 }
		);
	}

	try {
		const body = await request.json();
		const { language, code, stdin, timeLimitMs } = body;

		if (!code || typeof code !== 'string') {
			return json({ error: 'Validation Error', message: 'Code is required' }, { status: 400 });
		}

		if (code.length > 50000) {
			return json({ error: 'Validation Error', message: 'Code source exceeds maximum allowed size (50KB)' }, { status: 400 });
		}

		if (!['python', 'java', 'c', 'cpp'].includes(language)) {
			return json({ error: 'Validation Error', message: 'Supported languages: python, java, c, cpp' }, { status: 400 });
		}

		const result = await executeCodeInSandbox({
			language,
			code,
			stdin: stdin || '',
			timeLimitMs: Math.min(10000, Number(timeLimitMs) || 3000)
		});

		return json({ success: true, result });
	} catch (err: any) {
		console.error('Error in /api/code/run:', err);
		return json({ error: 'Execution Error', message: err.message || 'Failed to execute code' }, { status: 500 });
	}
};
