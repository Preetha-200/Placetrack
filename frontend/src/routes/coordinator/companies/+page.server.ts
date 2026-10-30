import type { PageServerLoad } from './$types';
import { getCompanies } from '$lib/server/services/coordinator';

export const load: PageServerLoad = async () => {
	try {
		const companies = await getCompanies();
		return {
			companies
		};
	} catch (err) {
		console.error('Failed to load companies from Firestore:', err);
		return {
			companies: []
		};
	}
};

