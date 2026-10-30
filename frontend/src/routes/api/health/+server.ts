import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { collections } from '$lib/server/firebase/collections';
import { getFirebaseAdmin } from '$lib/server/firebase/admin';
import { withTimeout } from '$lib/server/auth';

export const GET: RequestHandler = async () => {
	try {
		const { db } = getFirebaseAdmin();
		if (!db) {
			return json({ firestore: 'unreachable', usersCount: 0 });
		}

		const usersSnap = await withTimeout(collections.users().get(), 3000);
		return json({
			firestore: 'ok',
			usersCount: usersSnap.size
		});
	} catch {
		return json({ firestore: 'unreachable', usersCount: 0 });
	}
};
