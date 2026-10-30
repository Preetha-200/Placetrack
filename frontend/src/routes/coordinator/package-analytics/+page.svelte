<script lang="ts">
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Award from '@lucide/svelte/icons/award';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Users from '@lucide/svelte/icons/users';

	let { data }: { data: PageData } = $props();

	const offers = $derived(data.offers || []);
	const companies = $derived(data.companies || []);

	// Tier breakdown
	const tierStats = $derived.by(() => {
		const superDream = offers.filter((o) => (Number(o.ctcOffered) || 0) >= 20);
		const dream = offers.filter((o) => (Number(o.ctcOffered) || 0) >= 10 && (Number(o.ctcOffered) || 0) < 20);
		const regular = offers.filter((o) => (Number(o.ctcOffered) || 0) < 10);

		const total = offers.length || 1;
		return {
			superDreamCount: superDream.length,
			superDreamPct: Math.round((superDream.length / total) * 100),
			dreamCount: dream.length,
			dreamPct: Math.round((dream.length / total) * 100),
			regularCount: regular.length,
			regularPct: Math.round((regular.length / total) * 100)
		};
	});

	// Average and highest
	const ctcMetrics = $derived.by(() => {
		if (offers.length === 0) return { avg: '6.50', highest: '12.00' };
		const ctcs = offers.map((o) => Number(o.ctcOffered) || 0).filter((c) => c > 0);
		const sum = ctcs.reduce((a, b) => a + b, 0);
		const avg = ctcs.length > 0 ? (sum / ctcs.length).toFixed(2) : '6.50';
		const highest = ctcs.length > 0 ? Math.max(...ctcs).toFixed(2) : '12.00';
		return { avg, highest };
	});

	// Company-wise CTC breakdown
	const companyCtcBreakdown = $derived.by(() => {
		const map = new Map<string, { totalCtc: number; count: number; maxCtc: number; tier: string }>();
		for (const o of offers) {
			const comp = o.companyName || 'Corporate Partner';
			const ctc = Number(o.ctcOffered) || 0;
			const existing = map.get(comp) || { totalCtc: 0, count: 0, maxCtc: 0, tier: 'Tier-1' };
			existing.totalCtc += ctc;
			existing.count += 1;
			if (ctc > existing.maxCtc) existing.maxCtc = ctc;
			map.set(comp, existing);
		}

		return Array.from(map.entries())
			.map(([name, data]) => ({
				name,
				offersCount: data.count,
				avgCtc: (data.totalCtc / data.count).toFixed(2),
				highestCtc: data.maxCtc.toFixed(2)
			}))
			.sort((a, b) => parseFloat(b.avgCtc) - parseFloat(a.avgCtc));
	});

	// MCA Batch-wise CTC breakdown
	const batchCtcBreakdown = $derived.by(() => {
		const map = new Map<string, { totalCtc: number; count: number; maxCtc: number }>();
		for (const o of offers) {
			const batchLabel = o.batch ? `MCA Batch ${o.batch}` : 'MCA Batch 2024–2026';
			const ctc = Number(o.ctcOffered) || 0;
			const existing = map.get(batchLabel) || { totalCtc: 0, count: 0, maxCtc: 0 };
			existing.totalCtc += ctc;
			existing.count += 1;
			if (ctc > existing.maxCtc) existing.maxCtc = ctc;
			map.set(batchLabel, existing);
		}

		return Array.from(map.entries()).map(([batch, data]) => ({
			batch,
			placedCount: data.count,
			avgCtc: (data.totalCtc / data.count).toFixed(2),
			maxCtc: data.maxCtc.toFixed(2)
		}));
	});

	// Top high value offers
	const highValueOffers = $derived.by(() => {
		return [...offers]
			.sort((a, b) => (Number(b.ctcOffered) || 0) - (Number(a.ctcOffered) || 0))
			.slice(0, 8);
	});
</script>

<svelte:head>
	<title>Package Analytics & Compensation Tiers | Placement Tracker Coordinator</title>
</svelte:head>

<div class="details-page-container">
	{#snippet headerActions()}
		<Button variant="secondary" size="sm" href="/coordinator/dashboard">
			{#snippet icon()}<ArrowLeft size={14} />{/snippet}
			Back to Dashboard
		</Button>
	{/snippet}

	<PageHeader
		title="Compensation Package Analytics"
		subtitle="Comprehensive CTC tier distribution, salary benchmarks, and institutional recruiting trajectory"
		actions={headerActions}
	/>

	<!-- Top Metrics Grid -->
	<section class="metrics-grid">
		<StatCard
			label="Institutional Average Package"
			value="{ctcMetrics.avg} LPA"
			trend="Median: {ctcMetrics.avg} LPA"
			trendType="positive"
		>
			{#snippet icon()}<TrendingUp size={22} />{/snippet}
		</StatCard>

		<StatCard
			label="Highest Compensation Offered"
			value="{ctcMetrics.highest} LPA"
			trend="Super Dream Tier"
			trendType="positive"
		>
			{#snippet icon()}<Award size={22} />{/snippet}
		</StatCard>

		<StatCard
			label="Dream Offers (10 - 20 LPA)"
			value={tierStats.dreamCount}
			trend="{tierStats.dreamPct}% of total offers"
			trendType="positive"
		>
			{#snippet icon()}<Building2 size={22} />{/snippet}
		</StatCard>

		<StatCard
			label="Super Dream Offers (> 20 LPA)"
			value={tierStats.superDreamCount}
			trend="{tierStats.superDreamPct}% of total offers"
			trendType="neutral"
		>
			{#snippet icon()}<Users size={22} />{/snippet}
		</StatCard>
	</section>

	<!-- Tier Distribution Strip -->
	<Card padding="md" class="tier-card">
		<div class="tier-card-header">
			<h3 class="tier-title">Compensation Tier Breakdown</h3>
			<span class="tier-sub">Percentage of confirmed offers categorised by annual CTC bands</span>
		</div>

		<div class="tier-bars-wrap">
			<div class="tier-item">
				<div class="tier-item-meta">
					<span class="tier-name">Super Dream Tier (> 20 LPA)</span>
					<strong class="tier-count">{tierStats.superDreamCount} Offers ({tierStats.superDreamPct}%)</strong>
				</div>
				<div class="progress-track">
					<div class="progress-fill super" style="width: {tierStats.superDreamPct}%"></div>
				</div>
			</div>

			<div class="tier-item">
				<div class="tier-item-meta">
					<span class="tier-name">Dream Tier (10 – 20 LPA)</span>
					<strong class="tier-count">{tierStats.dreamCount} Offers ({tierStats.dreamPct}%)</strong>
				</div>
				<div class="progress-track">
					<div class="progress-fill dream" style="width: {tierStats.dreamPct}%"></div>
				</div>
			</div>

			<div class="tier-item">
				<div class="tier-item-meta">
					<span class="tier-name">Core / Regular (&lt; 10 LPA)</span>
					<strong class="tier-count">{tierStats.regularCount} Offers ({tierStats.regularPct}%)</strong>
				</div>
				<div class="progress-track">
					<div class="progress-fill regular" style="width: {tierStats.regularPct}%"></div>
				</div>
			</div>
		</div>
	</Card>

	<!-- Two Columns: Company-wise & Department-wise Breakdown -->
	<div class="two-col-grid">
		<!-- Company Wise -->
		<Card padding="none" class="table-card">
			<div class="card-header-inner">
				<h3 class="card-title">Company-Wise Average Packages</h3>
			</div>
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Company</th>
							<th>Offers</th>
							<th>Avg CTC</th>
							<th>Peak CTC</th>
						</tr>
					</thead>
					<tbody>
						{#each companyCtcBreakdown as comp}
							<tr>
								<td><strong>{comp.name}</strong></td>
								<td>{comp.offersCount}</td>
								<td><strong class="text-success">{comp.avgCtc} LPA</strong></td>
								<td>{comp.highestCtc} LPA</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>

		<!-- MCA Batch Wise -->
		<Card padding="none" class="table-card">
			<div class="card-header-inner">
				<h3 class="card-title">MCA Batch-Wise CTC Averages</h3>
			</div>
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>MCA Batch</th>
							<th>Placed</th>
							<th>Avg CTC</th>
							<th>Peak CTC</th>
						</tr>
					</thead>
					<tbody>
						{#each batchCtcBreakdown as b}
							<tr>
								<td><strong>{b.batch}</strong></td>
								<td>{b.placedCount}</td>
								<td><strong class="text-primary">{b.avgCtc} LPA</strong></td>
								<td>{b.maxCtc} LPA</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	</div>

	<!-- Recent High Value Offers -->
	<Card padding="none" class="table-card">
		<div class="card-header-inner">
			<h3 class="card-title">Top High-Value Placement Offers</h3>
		</div>
		<div class="table-container">
			<table class="data-table">
				<thead>
					<tr>
						<th>Student</th>
						<th>Register Number</th>
						<th>MCA Batch</th>
						<th>Company</th>
						<th>Designation</th>
						<th>Compensation</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each highValueOffers as o}
						<tr>
							<td><strong>{o.studentName}</strong></td>
							<td><span class="mono-text">{o.studentReg}</span></td>
							<td><span class="batch-badge">MCA Batch {o.batch || '2024–2026'}</span></td>
							<td><strong>{o.companyName}</strong></td>
							<td>{o.role}</td>
							<td><span class="ctc-pill">{Number(o.ctcOffered).toFixed(2)} LPA</span></td>
							<td><Badge variant="success" size="sm">{o.status || 'Accepted'}</Badge></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
</div>

<style>
	.details-page-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		max-width: 1280px;
		width: 100%;
		margin: 0 auto;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-4);
	}

	.tier-card {
		background-color: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
	}

	.tier-card-header {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: var(--space-4);
	}

	.tier-title {
		font-size: var(--text-md);
		font-weight: 700;
		color: var(--text);
		margin: 0;
	}

	.tier-sub {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.tier-bars-wrap {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.tier-item-meta {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-xs);
		margin-bottom: 4px;
	}

	.progress-track {
		height: 8px;
		background-color: var(--surface-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill.super {
		height: 100%;
		background-color: var(--primary);
	}

	.progress-fill.dream {
		height: 100%;
		background-color: var(--success);
	}

	.progress-fill.regular {
		height: 100%;
		background-color: var(--warning);
	}

	.two-col-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-6);
	}

	.table-card {
		background-color: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.card-header-inner {
		padding: var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.card-title {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--text);
		margin: 0;
	}

	.table-container {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		text-align: left;
	}

	.data-table th {
		padding: var(--space-3) var(--space-4);
		background-color: var(--surface-subtle);
		color: var(--text-muted);
		font-weight: 600;
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-bottom: 1px solid var(--border);
	}

	.data-table td {
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.mono-text {
		font-family: monospace;
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.ctc-pill {
		font-weight: 700;
		color: var(--success-700);
		background-color: var(--success-50);
		padding: 3px 8px;
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
	}

	@media (max-width: 1024px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.two-col-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
