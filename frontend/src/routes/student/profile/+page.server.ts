import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getStudentDashboardData } from '$lib/server/services/studentDashboard';

export const load: PageServerLoad = async ({ locals, url }) => {
	const tab = url.searchParams.get('tab') || 'overview';
	const category = url.searchParams.get('category') || 'aptitude';
	let dashboardData = null;
	let loadError: string | null = null;
	let dataSource: 'firestore' | 'local' = 'firestore';

	if (!locals.user) {
		throw redirect(303, '/login?redirect=/student/profile');
	}

	const userId = locals.user.id;

	try {
		dashboardData = await getStudentDashboardData(userId);
		dataSource = 'firestore';
	} catch (err: any) {
		console.error('Failed to load student dashboard data from Firestore:', err);
		loadError = err.message || 'Unable to connect to Cloud Firestore.';
		dashboardData = null;
	}

	return {
		user: locals.user,
		dashboardData,
		dataSource,
		loadError,
		initialTab: tab,
		initialCategory: category
	};
};
