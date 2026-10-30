<script lang="ts">
	import type { PageData } from './$types';
	import { driveState } from '$lib/coordinator/driveState.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';

	import PlacementFunnel from '$lib/coordinator/components/PlacementFunnel.svelte';
	import ReadinessDonut from '$lib/coordinator/components/ReadinessDonut.svelte';
	import MonthlyTrendChart from '$lib/coordinator/components/MonthlyTrendChart.svelte';
	import UpcomingDrivesCard from '$lib/coordinator/components/UpcomingDrivesCard.svelte';
	import RecentOffersCard from '$lib/coordinator/components/RecentOffersCard.svelte';

	import Plus from '@lucide/svelte/icons/plus';
	import Download from '@lucide/svelte/icons/download';
	import Users from '@lucide/svelte/icons/users';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Award from '@lucide/svelte/icons/award';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Calendar from '@lucide/svelte/icons/calendar';
	import FileText from '@lucide/svelte/icons/file-text';
	import UserCheck from '@lucide/svelte/icons/user-check';

	let { data }: { data: PageData } = $props();

	const analytics = $derived(data.analytics);
	const overview = $derived(analytics?.overview);
	const isLoading = $derived(!analytics || !overview);

	const formattedDate = $derived(
		new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(new Date())
	);

	function handleExportCSV() {
		if (!overview) return;

		const rows = [
			['Metric', 'Value'],
			['Report Date', formattedDate],
			['Total Registered Students', overview.totalStudents],
			['Placement Ready Students', overview.placementReadyStudents],
			['Students Needing Improvement', overview.studentsNeedingImprovement],
			['Readiness Percentage', `${overview.readinessPercentage}%`],
			['Recruiting Companies', overview.totalCompanies],
			['Active Campus Drives', overview.activeDrives],
			['Total Student Applications', overview.totalApplications],
			['Shortlisted Candidates', overview.shortlistedStudents],
			['Total Offers Accepted', overview.totalOffers],
			['Conversion Rate', `${overview.conversionRate}%`],
			['Average CTC (LPA)', `${overview.avgCtc} LPA`],
			['Highest CTC (LPA)', `${overview.highestCtc} LPA`],
			['Data Source', analytics.source]
		];

		const csvContent =
			'data:text/csv;charset=utf-8,' +
			rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `placement_overview_${new Date().toISOString().split('T')[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Placement Overview | Placement Tracker Coordinator</title>
</svelte:head>

<div class="overview-container">
	<!-- Page Header with Date and Actions -->
	{#snippet pageActions()}
		<Button variant="secondary" size="sm" onclick={handleExportCSV}>
			{#snippet icon()}
				<Download size={15} />
			{/snippet}
			Export Report
		</Button>
		<Button variant="primary" size="sm" onclick={() => driveState.openModal()}>
			{#snippet icon()}
				<Plus size={15} />
			{/snippet}
			Schedule Drive
		</Button>
	{/snippet}

	<PageHeader
		title="MCA Placement Overview"
		subtitle="{formattedDate} • Master of Computer Applications (MCA)"
		actions={pageActions}
	/>

	<!-- Top Row: 4 Large StatCards -->
	<section class="large-stats-grid" aria-label="Key Placement Metrics">
		{#if isLoading}
			<Skeleton height="110px" radius="lg" />
			<Skeleton height="110px" radius="lg" />
			<Skeleton height="110px" radius="lg" />
			<Skeleton height="110px" radius="lg" />
		{:else}
			{#snippet usersIcon()}
				<Users size={22} />
			{/snippet}
			<StatCard
				label="Total Registered Students"
				value={overview.totalStudents}
				trend="MCA Batches 2024–26"
				trendType="neutral"
				icon={usersIcon}
				href="/coordinator/students"
			/>

			{#snippet readyIcon()}
				<CheckCircle2 size={22} />
			{/snippet}
			<StatCard
				label="Placement Ready"
				value={overview.placementReadyStudents}
				trend="{overview.readinessPercentage}% of total"
				trendType="positive"
				icon={readyIcon}
				href="/coordinator/placement-ready"
			/>

			{#snippet offersIcon()}
				<Award size={22} />
			{/snippet}
			<StatCard
				label="Offers Confirmed"
				value={overview.totalOffers}
				trend="{overview.conversionRate}% conv."
				trendType="positive"
				icon={offersIcon}
				href="/coordinator/offers"
			/>

			{#snippet ctcIcon()}
				<TrendingUp size={22} />
			{/snippet}
			<StatCard
				label="Average Package"
				value="{Number(overview.avgCtc).toFixed(2)} LPA"
				trend="Peak: {Number(overview.highestCtc).toFixed(2)} LPA"
				trendType="neutral"
				icon={ctcIcon}
				href="/coordinator/package-analytics"
			/>
		{/if}
	</section>

	<!-- Secondary Strip: 4 Slim Stats -->
	<section class="slim-stats-strip" aria-label="Pipeline Activity Overview">
		{#if isLoading}
			<Skeleton height="60px" radius="md" />
			<Skeleton height="60px" radius="md" />
			<Skeleton height="60px" radius="md" />
			<Skeleton height="60px" radius="md" />
		{:else}
			<a href="/coordinator/companies" class="slim-stat-box is-interactive" aria-label="Recruiting Companies: {overview.totalCompanies}">
				<div class="slim-icon"><Building2 size={16} /></div>
				<div class="slim-content">
					<span class="slim-label">Recruiting Companies</span>
					<strong class="slim-value">{overview.totalCompanies}</strong>
				</div>
			</a>

			<a href="/coordinator/drives" class="slim-stat-box is-interactive" aria-label="Active Campus Drives: {overview.activeDrives}">
				<div class="slim-icon"><Calendar size={16} /></div>
				<div class="slim-content">
					<span class="slim-label">Active Campus Drives</span>
					<strong class="slim-value">{overview.activeDrives}</strong>
				</div>
			</a>

			<a href="/coordinator/applications" class="slim-stat-box is-interactive" aria-label="Student Applications: {overview.totalApplications}">
				<div class="slim-icon"><FileText size={16} /></div>
				<div class="slim-content">
					<span class="slim-label">Student Applications</span>
					<strong class="slim-value">{overview.totalApplications}</strong>
				</div>
			</a>

			<a href="/coordinator/shortlisted" class="slim-stat-box is-interactive" aria-label="Shortlisted Candidates: {overview.shortlistedStudents}">
				<div class="slim-icon"><UserCheck size={16} /></div>
				<div class="slim-content">
					<span class="slim-label">Shortlisted Candidates</span>
					<strong class="slim-value">{overview.shortlistedStudents}</strong>
				</div>
			</a>
		{/if}
	</section>

	<!-- Analytics Row: Funnel & Donut Distribution -->
	<section class="two-col-grid" aria-label="Pipeline and Readiness Breakdown">
		<PlacementFunnel {overview} loading={isLoading} />
		<ReadinessDonut {overview} loading={isLoading} />
	</section>

	<!-- Monthly Trajectory Chart -->
	<section aria-label="Placement and Package Trajectory">
		<MonthlyTrendChart
			trends={analytics?.monthlyPlacementTrends}
			loading={isLoading}
		/>
	</section>

	<!-- Activity Feeds: Upcoming Drives & Recent Offers -->
	<section class="two-col-grid" aria-label="Drives and Offers Activity">
		<UpcomingDrivesCard
			drives={driveState.drives.length > 0 ? driveState.drives : analytics?.drives}
			loading={isLoading}
		/>
		<RecentOffersCard
			offers={analytics?.recentOffers}
			loading={isLoading}
		/>
	</section>
</div>

<style>
	.overview-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		max-width: 1280px;
		width: 100%;
		margin: 0 auto;
	}

	/* Large 4-StatCard Grid */
	.large-stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-5);
	}

	/* Slim Secondary Strip */
	.slim-stats-strip {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-4);
	}

	.slim-stat-box {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		background-color: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3) var(--space-4);
		box-shadow: var(--shadow-sm);
		text-decoration: none;
		color: inherit;
	}

	.slim-stat-box.is-interactive {
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
	}

	.slim-stat-box.is-interactive:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		border-color: var(--primary-300, #93c5fd);
	}

	.slim-stat-box.is-interactive:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	.slim-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		background-color: var(--primary-50);
		color: var(--primary);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.slim-content {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.slim-label {
		font-size: var(--text-2xs);
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.slim-value {
		font-size: var(--text-md);
		font-weight: 700;
		color: var(--text);
		line-height: var(--lh-sm);
	}

	/* Two Column Responsive Grid */
	.two-col-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-6);
	}

	@media (max-width: 1024px) {
		.large-stats-grid,
		.slim-stats-strip {
			grid-template-columns: repeat(2, 1fr);
		}

		.two-col-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.large-stats-grid,
		.slim-stats-strip {
			grid-template-columns: 1fr;
		}
	}
</style>
