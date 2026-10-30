<script lang="ts">
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';

	import MonthlyTrendsExpanded from '$lib/coordinator/components/MonthlyTrendsExpanded.svelte';
	import OffersTable from '$lib/coordinator/components/OffersTable.svelte';

	import Award from '@lucide/svelte/icons/award';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Zap from '@lucide/svelte/icons/zap';

	let { data }: { data: PageData } = $props();

	const analytics = $derived(data.analytics);
	const overview = $derived(analytics?.overview);
	const isLoading = $derived(!analytics || !overview);
</script>

<svelte:head>
	<title>Placement Offers & Trends | Placement Tracker Coordinator</title>
</svelte:head>

<div class="placements-page">
	<PageHeader
		title="Placement Offers & Trends"
		subtitle="Comprehensive chronological distribution of verified company offers and compensation package trajectories."
	/>

	<!-- 3 Large StatCards at Top -->
	<section class="stat-cards-triplet" aria-label="Placement Offer Metrics">
		{#if isLoading}
			<Skeleton height="110px" radius="lg" />
			<Skeleton height="110px" radius="lg" />
			<Skeleton height="110px" radius="lg" />
		{:else}
			{#snippet offersIcon()}
				<Award size={22} />
			{/snippet}
			<StatCard
				label="Total Offers Confirmed"
				value={overview.totalOffers}
				trend="{overview.conversionRate}% conversion"
				trendType="positive"
				icon={offersIcon}
			/>

			{#snippet avgIcon()}
				<TrendingUp size={22} />
			{/snippet}
			<StatCard
				label="Average Salary Package"
				value="{overview.avgCtc} LPA"
				trend="Median CTC"
				trendType="neutral"
				icon={avgIcon}
			/>

			{#snippet peakIcon()}
				<Zap size={22} />
			{/snippet}
			<StatCard
				label="Highest CTC Package"
				value="{overview.highestCtc} LPA"
				trend="Peak compensation"
				trendType="positive"
				icon={peakIcon}
			/>
		{/if}
	</section>

	<!-- Larger Monthly Trend Chart with Data Table -->
	<section aria-label="Monthly Placement Trends">
		<MonthlyTrendsExpanded
			trends={analytics?.monthlyPlacementTrends}
			loading={isLoading}
		/>
	</section>

	<!-- Comprehensive Offers Table with Search, Filter, Sort, CSV Export, Pagination -->
	<section aria-label="Offers Roster">
		<OffersTable
			offers={analytics?.recentOffers}
			loading={isLoading}
		/>
	</section>
</div>

<style>
	.placements-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		max-width: 1280px;
		width: 100%;
		margin: 0 auto;
	}

	.stat-cards-triplet {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-5);
	}

	@media (max-width: 900px) {
		.stat-cards-triplet {
			grid-template-columns: 1fr;
		}
	}
</style>
