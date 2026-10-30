import type { PageServerLoad } from './$types';
import { getPlacementOffers, getCompanies } from '$lib/server/services/coordinator';

export const load: PageServerLoad = async () => {
	try {
		const [offers, companies] = await Promise.all([
			getPlacementOffers(),
			getCompanies()
		]);
		return {
			offers,
			companies
		};
	} catch (err) {
		console.error('Failed to load package analytics data:', err);
		return {
			offers: [],
			companies: []
		};
	}
};
