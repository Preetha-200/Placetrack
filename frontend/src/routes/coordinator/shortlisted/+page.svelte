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
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import UserCheck from '@lucide/svelte/icons/user-check';
	import Clock from '@lucide/svelte/icons/clock';
	import Award from '@lucide/svelte/icons/award';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedBatch = $state('all');
	let selectedCompany = $state('all');
	let selectedStage = $state('all');
	let currentPage = $state(1);
	const pageSize = 10;

	const allCandidates = $derived(data.applications || []);
	const studentsMap = $derived.by(() => {
		const m = new Map<string, any>();
		for (const s of data.students || []) {
			if (s.id) m.set(s.id, s);
			if (s.registerNumber) m.set(s.registerNumber, s);
		}
		return m;
	});

	const availableBatches = $derived.by(() => {
		const s = new Set<string>();
		for (const c of allCandidates) if (c.batch) s.add(c.batch);
		return Array.from(s).sort();
	});

	const availableCompanies = $derived.by(() => {
		const s = new Set<string>();
		for (const c of allCandidates) if (c.companyName) s.add(c.companyName);
		return Array.from(s).sort();
	});

	const availableStages = $derived.by(() => {
		const s = new Set<string>();
		for (const c of allCandidates) if (c.status) s.add(c.status);
		return Array.from(s);
	});

	const filteredCandidates = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return allCandidates.filter((c) => {
			const matchesSearch =
				!q ||
				c.studentName?.toLowerCase().includes(q) ||
				c.studentReg?.toLowerCase().includes(q) ||
				c.companyName?.toLowerCase().includes(q) ||
				c.role?.toLowerCase().includes(q);

			const matchesBatch = selectedBatch === 'all' || c.batch === selectedBatch;
			const matchesCompany = selectedCompany === 'all' || c.companyName === selectedCompany;
			const matchesStage = selectedStage === 'all' || c.status === selectedStage;

			return matchesSearch && matchesBatch && matchesCompany && matchesStage;
		});
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filteredCandidates.length / pageSize)));
	const paginatedCandidates = $derived(
		filteredCandidates.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	function getStageVariant(status: string): 'neutral' | 'success' | 'info' | 'danger' | 'warning' {
		switch (status) {
			case 'Selected':
			case 'Offered':
				return 'success';
			case 'Technical Interview':
			case 'HR Interview':
				return 'warning';
			case 'Assessment':
			case 'Shortlisted':
				return 'info';
			default:
				return 'neutral';
		}
	}
</script>

<svelte:head>
	<title>Shortlisted Candidates | Placement Tracker Coordinator</title>
</svelte:head>

<div class="details-page-container">
	{#snippet headerActions()}
		<Button variant="secondary" size="sm" href="/coordinator/dashboard">
			{#snippet icon()}<ArrowLeft size={14} />{/snippet}
			Back to Dashboard
		</Button>
	{/snippet}

	<PageHeader
		title="Shortlisted Candidates"
		subtitle="Students advancing through corporate technical assessments and interview rounds"
		actions={headerActions}
	/>

	<!-- Stats Overview -->
	<div class="stats-row">
		<div class="stat-pill">
			<UserCheck size={18} class="stat-icon text-primary" />
			<div>
				<div class="stat-number">{allCandidates.length}</div>
				<div class="stat-title">Shortlisted Total</div>
			</div>
		</div>
		<div class="stat-pill">
			<Clock size={18} class="stat-icon text-warning" />
			<div>
				<div class="stat-number">
					{allCandidates.filter((c) => c.status.includes('Interview')).length}
				</div>
				<div class="stat-title">Interview Stage</div>
			</div>
		</div>
		<div class="stat-pill">
			<Award size={18} class="stat-icon text-success" />
			<div>
				<div class="stat-number">
					{allCandidates.filter((c) => ['Selected', 'Offered'].includes(c.status)).length}
				</div>
				<div class="stat-title">Offers Secured</div>
			</div>
		</div>
	</div>

	<Card padding="none" class="table-card">
		<!-- Filter Toolbar -->
		<div class="filters-bar">
			<div class="search-wrap">
				<Search size={15} class="search-icon" />
				<input
					type="text"
					placeholder="Search shortlisted candidates, company, role..."
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

				{#if availableStages.length > 0}
					<select class="filter-select" bind:value={selectedStage} onchange={() => (currentPage = 1)}>
						<option value="all">All Selection Stages</option>
						{#each availableStages as s}
							<option value={s}>{s}</option>
						{/each}
					</select>
				{/if}
			</div>
		</div>

		<!-- Table -->
		<div class="table-responsive">
			<table class="data-table">
				<thead>
					<tr>
						<th>Student Candidate</th>
						<th>MCA Batch</th>
						<th>Company & Opportunity</th>
						<th>Target Role</th>
						<th>Selection Stage</th>
						<th>Readiness Score</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if paginatedCandidates.length === 0}
						<tr>
							<td colspan="7" class="empty-cell">
								<EmptyState
									title="No shortlisted candidates found"
									description="No student applications currently match the active filters."
								/>
							</td>
						</tr>
					{:else}
						{#each paginatedCandidates as item (item.id)}
							{@const s = (studentsMap.get(item.studentId) || studentsMap.get(item.studentReg)) as any}
							<tr class="table-row">
								<td>
									<div class="student-cell">
										<span class="student-name">{item.studentName}</span>
										<span class="student-id">{item.studentReg || item.studentId}</span>
									</div>
								</td>
								<td>
									<div class="dept-cell">
										<span class="batch-text">MCA Batch {item.batch || '2024–2026'}</span>
									</div>
								</td>
								<td>
									<span class="company-text">{item.companyName}</span>
								</td>
								<td>
									<span class="role-text">{item.role}</span>
								</td>
								<td>
									<Badge variant={getStageVariant(item.status)} size="sm">
										{item.status}
									</Badge>
								</td>
								<td>
									<div class="score-pill">
										<span class="score-val">{s?.readinessScore ?? 82}%</span>
									</div>
								</td>
								<td class="text-right">
									<Button
										variant="ghost"
										size="sm"
										href="/coordinator/students?search={encodeURIComponent(item.studentReg || item.studentName)}"
									>
										{#snippet icon()}<ExternalLink size={13} />{/snippet}
										Profile
									</Button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if filteredCandidates.length > 0}
			<div class="pagination-footer">
				<span class="pagination-info">
					Showing {(currentPage - 1) * pageSize + 1} to {Math.min(
						currentPage * pageSize,
						filteredCandidates.length
					)} of {filteredCandidates.length} candidates
				</span>
				<div class="pagination-controls">
					<Button
						variant="ghost"
						size="sm"
						disabled={currentPage === 1}
						onclick={() => (currentPage -= 1)}
					>
						{#snippet icon()}<ChevronLeft size={14} />{/snippet}
						Previous
					</Button>
					<span class="page-number">Page {currentPage} of {totalPages}</span>
					<Button
						variant="ghost"
						size="sm"
						disabled={currentPage === totalPages}
						onclick={() => (currentPage += 1)}
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

	.stats-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4);
	}

	@media (max-width: 768px) {
		.stats-row {
			grid-template-columns: 1fr;
		}
	}

	.stat-pill {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.stat-number {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
		line-height: 1.2;
	}

	.stat-title {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 500;
	}

	:global(.table-card) {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		overflow: hidden;
		background: var(--color-surface);
	}

	.filters-bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		padding: var(--space-4);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface-subtle);
		align-items: center;
	}

	.search-wrap {
		position: relative;
		flex: 1;
		min-width: 240px;
	}

	:global(.search-icon) {
		position: absolute;
		left: var(--space-3);
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2.25rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		color: var(--color-text-primary);
		outline: none;
	}

	.search-input:focus {
		border-color: var(--color-primary);
	}

	.dropdowns-wrap {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.filter-select {
		padding: 0.5rem 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		color: var(--color-text-primary);
		outline: none;
		cursor: pointer;
	}

	.table-responsive {
		width: 100%;
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 0.8125rem;
	}

	.data-table th {
		padding: 0.75rem 1rem;
		background: var(--color-surface-subtle);
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}

	.data-table td {
		padding: 0.875rem 1rem;
		border-bottom: 1px solid var(--color-border-subtle);
		vertical-align: middle;
	}

	.table-row:hover {
		background: var(--color-surface-hover);
	}

	.student-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.student-name {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.student-id {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		color: var(--color-text-muted);
	}

	.dept-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.dept-text {
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.batch-text {
		font-size: 0.6875rem;
		color: var(--color-text-muted);
	}

	.company-text {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.role-text {
		color: var(--color-text-secondary);
	}

	.score-pill {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		background: var(--color-surface-subtle);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-primary);
	}

	.text-right {
		text-align: right;
	}

	.empty-cell {
		padding: var(--space-8);
		text-align: center;
	}

	.pagination-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-subtle);
		font-size: 0.8125rem;
	}

	.pagination-info {
		color: var(--color-text-muted);
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.page-number {
		color: var(--color-text-secondary);
		font-weight: 500;
	}
</style>
