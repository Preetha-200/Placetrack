<script lang="ts">
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Search from '@lucide/svelte/icons/search';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Award from '@lucide/svelte/icons/award';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedBatch = $state('all');
	let selectedCompany = $state('all');
	let sortBy = $state<'date' | 'ctc'>('date');
	let currentPage = $state(1);
	const pageSize = 10;

	const allOffers = $derived(data.offers || []);

	const availableBatches = $derived.by(() => {
		const s = new Set<string>();
		for (const o of allOffers) if (o.batch) s.add(o.batch);
		return Array.from(s).sort();
	});

	const availableCompanies = $derived.by(() => {
		const s = new Set<string>();
		for (const o of allOffers) if (o.companyName) s.add(o.companyName);
		return Array.from(s).sort();
	});

	const filteredOffers = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		let list = allOffers.filter((o) => {
			const matchesSearch =
				!q ||
				o.studentName.toLowerCase().includes(q) ||
				o.studentReg.toLowerCase().includes(q) ||
				o.companyName.toLowerCase().includes(q) ||
				o.role.toLowerCase().includes(q);

			const matchesBatch = selectedBatch === 'all' || o.batch === selectedBatch;
			const matchesComp = selectedCompany === 'all' || o.companyName === selectedCompany;

			return matchesSearch && matchesBatch && matchesComp;
		});

		list = [...list].sort((a, b) => {
			if (sortBy === 'ctc') {
				return (Number(b.ctcOffered) || 0) - (Number(a.ctcOffered) || 0);
			}
			return new Date(b.offerDate).getTime() - new Date(a.offerDate).getTime();
		});

		return list;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filteredOffers.length / pageSize)));
	const paginatedOffers = $derived(
		filteredOffers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);
</script>

<svelte:head>
	<title>Confirmed Offers | MCA Placement Tracker</title>
</svelte:head>

<div class="details-page-container">
	{#snippet headerActions()}
		<Button variant="secondary" size="sm" href="/coordinator/dashboard">
			{#snippet icon()}<ArrowLeft size={14} />{/snippet}
			Back to Dashboard
		</Button>
	{/snippet}

	<PageHeader
		title="Confirmed Placement Offers"
		subtitle="Verified corporate offer letters issued to eligible MCA scholars"
		actions={headerActions}
	/>

	<Card padding="none" class="table-card">
		<div class="filters-bar">
			<div class="search-wrap">
				<Search size={15} class="search-icon" />
				<input
					type="text"
					placeholder="Search candidate, company, or job role..."
					class="search-input"
					bind:value={searchQuery}
					oninput={() => (currentPage = 1)}
				/>
			</div>

			<div class="dropdowns-wrap">
				{#if availableBatches.length > 0}
					<select class="filter-select" bind:value={selectedBatch} onchange={() => (currentPage = 1)}>
						<option value="all">All Batches</option>
						{#each availableBatches as b}
							<option value={b}>Batch {b}</option>
						{/each}
					</select>
				{/if}

				{#if availableCompanies.length > 0}
					<select class="filter-select" bind:value={selectedCompany} onchange={() => (currentPage = 1)}>
						<option value="all">All Companies</option>
						{#each availableCompanies as c}
							<option value={c}>{c}</option>
						{/each}
					</select>
				{/if}

				<select class="filter-select" bind:value={sortBy}>
					<option value="date">Sort by Date (Recent)</option>
					<option value="ctc">Sort by Package (Highest CTC)</option>
				</select>
			</div>
		</div>

		{#if filteredOffers.length === 0}
			<div class="empty-wrap">
				<EmptyState
					title="No Confirmed Offers Found"
					description="No confirmed placement offers match the active search and filter parameters."
				/>
			</div>
		{:else}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Candidate</th>
							<th>Register Number</th>
							<th>MCA Batch</th>
							<th>Company</th>
							<th>Job Role</th>
							<th>Package (CTC)</th>
							<th>Offer Date</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedOffers as offer}
							<tr>
								<td>
									<strong class="student-name">{offer.studentName}</strong>
								</td>
								<td>
									<span class="mono-text">{offer.studentReg}</span>
								</td>
								<td>
									<span class="batch-badge">MCA Batch {offer.batch || '2024–2026'}</span>
								</td>
								<td>
									<strong class="company-name">{offer.companyName}</strong>
								</td>
								<td>{offer.role}</td>
								<td>
									<span class="ctc-badge">{Number(offer.ctcOffered).toFixed(2)} LPA</span>
								</td>
								<td>
									{new Date(offer.offerDate).toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric',
										year: 'numeric'
									})}
								</td>
								<td>
									<Badge variant="success" size="sm">
										{offer.status || 'Accepted'}
									</Badge>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="pagination-footer">
				<span class="page-meta">
					Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredOffers.length)} of {filteredOffers.length} offers
				</span>

				<div class="page-buttons">
					<Button
						variant="secondary"
						size="sm"
						disabled={currentPage <= 1}
						onclick={() => currentPage--}
					>
						{#snippet icon()}<ChevronLeft size={14} />{/snippet}
						Previous
					</Button>
					<span class="page-current">Page {currentPage} of {totalPages}</span>
					<Button
						variant="secondary"
						size="sm"
						disabled={currentPage >= totalPages}
						onclick={() => currentPage++}
					>
						Next
						{#snippet icon()}<ChevronRight size={14} />{/snippet}
					</Button>
				</div>
			</div>
		{/if}
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

	.table-card {
		background-color: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.filters-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-4);
		border-bottom: 1px solid var(--border);
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.search-wrap {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 260px;
	}

	.search-wrap :global(.search-icon) {
		position: absolute;
		left: var(--space-3);
		color: var(--text-muted);
	}

	.search-input {
		width: 100%;
		padding: 8px 12px 8px 34px;
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background-color: var(--surface);
		color: var(--text);
		outline: none;
	}

	.dropdowns-wrap {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.filter-select {
		padding: 7px 12px;
		font-size: var(--text-xs);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background-color: var(--surface);
		color: var(--text);
		outline: none;
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
		padding: var(--space-3-5) var(--space-4);
		border-bottom: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.student-name {
		color: var(--text);
	}

	.company-name {
		color: var(--text);
	}

	.mono-text {
		font-family: monospace;
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.ctc-badge {
		font-weight: 700;
		color: var(--success-700);
		background-color: var(--success-50);
		padding: 3px 8px;
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
	}

	.pagination-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--border);
		background-color: var(--surface-subtle);
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.page-meta {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.page-buttons {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.page-current {
		font-size: var(--text-xs);
		color: var(--text-secondary);
		padding: 0 var(--space-2);
	}

	.empty-wrap {
		padding: var(--space-8);
	}
</style>
