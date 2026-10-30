import type { PageServerLoad } from './$types';
import { getPlacementOffers } from '$lib/server/services/coordinator';

export const load: PageServerLoad = async () => {
	try {
		const offers = await getPlacementOffers();
		return {
			offers
		};
	} catch (err) {
		console.error('Failed to load confirmed offers:', err);
		return {
			offers: []
		};
	}
};
