import type { LayoutServerLoad } from './$types';
import {
	getCoordinatorAnalytics,
	getEmptyCoordinatorAnalytics,
	type CoordinatorAnalyticsResult
} from '$lib/server/services/analytics';

export const load: LayoutServerLoad = async ({ locals }) => {
	let analytics: CoordinatorAnalyticsResult;
	let loadError: string | null = null;

	try {
		analytics = await getCoordinatorAnalytics();
	} catch (err) {
		console.error('Failed to load coordinator analytics from Firestore:', err);
		analytics = getEmptyCoordinatorAnalytics();
		loadError = 'Could not reach the database, showing no data';
	}

	return {
		user: locals.user,
		analytics,
		loadError
	};
};

