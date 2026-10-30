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

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedBatch = $state('all');
	let selectedStatus = $state('all');
	let currentPage = $state(1);
	const pageSize = 10;

	const allStudents = $derived(data.students || []);

	const availableBatches = $derived.by(() => {
		const s = new Set<string>();
		for (const st of allStudents) if (st.batch) s.add(st.batch);
		return Array.from(s).sort();
	});

	const filteredStudents = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return allStudents.filter((st) => {
			const matchesSearch =
				!q ||
				st.name.toLowerCase().includes(q) ||
				st.registerNumber.toLowerCase().includes(q) ||
				(st.email && st.email.toLowerCase().includes(q));

			const matchesBatch = selectedBatch === 'all' || st.batch === selectedBatch;
			const matchesStatus =
				selectedStatus === 'all' ||
				st.placementStatus === selectedStatus ||
				st.readinessStatus === selectedStatus;

			return matchesSearch && matchesBatch && matchesStatus;
		});
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filteredStudents.length / pageSize)));
	const paginatedStudents = $derived(
		filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);
</script>

<svelte:head>
	<title>MCA Student Roster | Placement Tracker Coordinator</title>
</svelte:head>

<div class="details-page-container">
	{#snippet headerActions()}
		<Button variant="secondary" size="sm" href="/coordinator/dashboard">
			{#snippet icon()}<ArrowLeft size={14} />{/snippet}
			Back to Dashboard
		</Button>
	{/snippet}

	<PageHeader
		title="MCA Student Roster"
		subtitle="Comprehensive student registry across Master of Computer Applications (MCA) cohorts"
		actions={headerActions}
	/>

	<Card padding="none" class="table-card">
		<div class="filters-bar">
			<div class="search-wrap">
				<Search size={15} class="search-icon" />
				<input
					type="text"
					placeholder="Search by student name, register number, or email..."
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

				<select class="filter-select" bind:value={selectedStatus} onchange={() => (currentPage = 1)}>
					<option value="all">All Statuses</option>
					<option value="Placement Ready">Placement Ready</option>
					<option value="Placed">Placed</option>
					<option value="Eligible">Eligible</option>
				</select>
			</div>
		</div>

		{#if filteredStudents.length === 0}
			<div class="empty-wrap">
				<EmptyState
					title="No Students Found"
					description="No student records match the active search and filter criteria."
				/>
			</div>
		{:else}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Student Name</th>
							<th>Register Number</th>
							<th>Email</th>
							<th>MCA Batch</th>
							<th>Placement Readiness</th>
							<th>Placement Status</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedStudents as student}
							<tr>
								<td>
									<strong class="student-name">{student.name}</strong>
								</td>
								<td>
									<span class="mono-text">{student.registerNumber}</span>
								</td>
								<td class="email-text">{student.email}</td>
								<td>
									<span class="batch-badge">MCA Batch {student.batch || '2024–2026'}</span>
								</td>
								<td>
									<div class="readiness-cell">
										<Badge
											variant={student.readinessScore >= 75 ? 'success' : 'warning'}
											size="sm"
										>
											{student.readinessScore}% • {student.readinessStatus || 'Ready'}
										</Badge>
									</div>
								</td>
								<td>
									<Badge
										variant={student.placementStatus === 'Placed' ? 'success' : 'neutral'}
										size="sm"
									>
										{student.placementStatus || 'Eligible'}
									</Badge>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination footer -->
			<div class="pagination-footer">
				<span class="page-meta">
					Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students
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

	.mono-text {
		font-family: monospace;
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.email-text {
		color: var(--text-muted);
		font-size: var(--text-xs);
	}

	.batch-badge {
		font-size: var(--text-2xs);
		background-color: var(--surface-subtle);
		padding: 3px 8px;
		border-radius: var(--radius-sm);
		font-weight: 600;
	}

	.readiness-cell {
		display: flex;
		align-items: center;
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
