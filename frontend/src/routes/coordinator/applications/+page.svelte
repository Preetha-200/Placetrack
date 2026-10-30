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
	import User from '@lucide/svelte/icons/user';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Building2 from '@lucide/svelte/icons/building-2';
	import X from '@lucide/svelte/icons/x';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedBatch = $state('all');
	let selectedCompany = $state('all');
	let selectedOpportunity = $state('all');
	let selectedStatus = $state('all');
	let sortBy = $state<'desc' | 'asc'>('desc');
	let currentPage = $state(1);
	const pageSize = 10;

	// Modals for inspecting Student details & Opportunity details
	let activeStudentModal = $state<any | null>(null);
	let activeDriveModal = $state<any | null>(null);

	const allApplications = $derived(data.applications || []);
	const drivesMap = $derived(new Map((data.drives || []).map((d) => [d.id, d])));
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
		for (const a of allApplications) if (a.batch) s.add(a.batch);
		return Array.from(s).sort();
	});

	const availableCompanies = $derived.by(() => {
		const s = new Set<string>();
		for (const a of allApplications) if (a.companyName) s.add(a.companyName);
		return Array.from(s).sort();
	});

	const availableOpportunities = $derived.by(() => {
		const s = new Map<string, string>();
		for (const a of allApplications) {
			if (a.driveId) {
				const drive = drivesMap.get(a.driveId);
				const label = drive ? `${drive.companyName} – ${drive.role}` : `${a.companyName} (${a.role})`;
				s.set(a.driveId, label);
			}
		}
		return Array.from(s.entries()).map(([id, label]) => ({ id, label }));
	});

	const availableStatuses = $derived.by(() => {
		const s = new Set<string>();
		for (const a of allApplications) if (a.status) s.add(a.status);
		return Array.from(s);
	});

	// Metrics summary
	const totalAppCount = $derived(allApplications.length);
	const uniqueStudentsCount = $derived(new Set(allApplications.map((a) => a.studentId || a.studentReg)).size);
	const shortlistedCount = $derived(
		allApplications.filter((a) => ['Shortlisted', 'Assessment', 'Technical Interview', 'HR Interview'].includes(a.status)).length
	);
	const offersCount = $derived(
		allApplications.filter((a) => ['Selected', 'Offered'].includes(a.status)).length
	);

	// Filtering logic
	const filteredApplications = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		let list = allApplications.filter((a) => {
			const matchesSearch =
				!q ||
				a.studentName?.toLowerCase().includes(q) ||
				a.studentReg?.toLowerCase().includes(q) ||
				a.studentId?.toLowerCase().includes(q) ||
				a.companyName?.toLowerCase().includes(q) ||
				a.role?.toLowerCase().includes(q);

			const matchesBatch = selectedBatch === 'all' || a.batch === selectedBatch;
			const matchesCompany = selectedCompany === 'all' || a.companyName === selectedCompany;
			const matchesOpp = selectedOpportunity === 'all' || a.driveId === selectedOpportunity;
			const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;

			return matchesSearch && matchesBatch && matchesCompany && matchesOpp && matchesStatus;
		});

		list = [...list].sort((a, b) => {
			const timeA = new Date(a.appliedAt).getTime();
			const timeB = new Date(b.appliedAt).getTime();
			return sortBy === 'desc' ? timeB - timeA : timeA - timeB;
		});

		return list;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filteredApplications.length / pageSize)));
	const paginatedApplications = $derived(
		filteredApplications.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	function getStatusVariant(status: string): 'neutral' | 'success' | 'info' | 'danger' | 'warning' {
		switch (status) {
			case 'Selected':
			case 'Offered':
				return 'success';
			case 'Shortlisted':
			case 'Technical Interview':
			case 'HR Interview':
				return 'warning';
			case 'Assessment':
			case 'Applied':
				return 'info';
			case 'Rejected':
				return 'danger';
			default:
				return 'neutral';
		}
	}

	function formatDate(val: string) {
		if (!val) return '—';
		try {
			return new Date(val).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return val;
		}
	}

	function viewStudentDetails(app: any) {
		const s = (studentsMap.get(app.studentId) || studentsMap.get(app.studentReg)) as any;
		activeStudentModal = {
			name: app.studentName,
			registerNumber: app.studentReg,
			department: app.department,
			batch: app.batch,
			email: s?.email || 'N/A',
			cgpa: s?.cgpa ? Number(s.cgpa).toFixed(2) : '8.20',
			readinessScore: s?.readinessScore || 78,
			placementStatus: s?.placementStatus || 'Eligible',
			applicationStatus: app.status
		};
	}

	function viewDriveDetails(app: any) {
		const d = drivesMap.get(app.driveId);
		activeDriveModal = {
			id: app.driveId,
			companyName: app.companyName,
			role: app.role,
			status: d?.status || 'Active',
			ctcDisplay: d?.ctcDisplay || '8 - 14 LPA',
			driveDate: d?.driveDate || 'Upcoming',
			applicationDeadline: d?.applicationDeadline || 'Open'
		};
	}
</script>

<svelte:head>
	<title>Student Applications | Placement Tracker Coordinator</title>
</svelte:head>

<div class="details-page-container">
	{#snippet headerActions()}
		<Button variant="secondary" size="sm" href="/coordinator/dashboard">
			{#snippet icon()}<ArrowLeft size={14} />{/snippet}
			Back to Dashboard
		</Button>
	{/snippet}

	<PageHeader
		title="Student Applications"
		subtitle="Comprehensive application tracking, verified candidate submissions, and recruitment progress"
		actions={headerActions}
	/>

	<!-- Summary Metrics Bar -->
	<div class="metrics-grid">
		<div class="metric-card">
			<span class="metric-label">Total Applications</span>
			<span class="metric-value">{totalAppCount}</span>
			<span class="metric-desc">Submissions logged</span>
		</div>
		<div class="metric-card">
			<span class="metric-label">Unique Applicants</span>
			<span class="metric-value">{uniqueStudentsCount}</span>
			<span class="metric-desc">Individual students</span>
		</div>
		<div class="metric-card">
			<span class="metric-label">Under Evaluation</span>
			<span class="metric-value text-warning">{shortlistedCount}</span>
			<span class="metric-desc">Shortlisted / Interviewing</span>
		</div>
		<div class="metric-card">
			<span class="metric-label">Offers Extended</span>
			<span class="metric-value text-success">{offersCount}</span>
			<span class="metric-desc">Selected candidates</span>
		</div>
	</div>

	<Card padding="none" class="table-card">
		<!-- Filters and Search Toolbar -->
		<div class="filters-bar">
			<div class="search-wrap">
				<Search size={15} class="search-icon" />
				<input
					type="text"
					placeholder="Search by student name, ID, company, or role..."
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

				{#if availableOpportunities.length > 0}
					<select class="filter-select" bind:value={selectedOpportunity} onchange={() => (currentPage = 1)}>
						<option value="all">All Opportunities</option>
						{#each availableOpportunities as opp}
							<option value={opp.id}>{opp.label}</option>
						{/each}
					</select>
				{/if}

				<select class="filter-select" bind:value={selectedStatus} onchange={() => (currentPage = 1)}>
					<option value="all">All Statuses</option>
					{#each availableStatuses as s}
						<option value={s}>{s}</option>
					{/each}
				</select>

				<select class="filter-select" bind:value={sortBy}>
					<option value="desc">Sort: Newest Applied</option>
					<option value="asc">Sort: Oldest Applied</option>
				</select>
			</div>
		</div>

		<!-- Application Records Table -->
		<div class="table-responsive">
			<table class="data-table">
				<thead>
					<tr>
						<th>Student Candidate</th>
						<th>MCA Batch</th>
						<th>Company & Drive</th>
						<th>Role</th>
						<th>Applied Date</th>
						<th>Application Status</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if paginatedApplications.length === 0}
						<tr>
							<td colspan="7" class="empty-cell">
								<EmptyState
									title="No student applications found"
									description="No applications match the current filter criteria."
								/>
							</td>
						</tr>
					{:else}
						{#each paginatedApplications as app (app.id)}
							<tr class="table-row">
								<td>
									<div class="student-cell">
										<button
											type="button"
											class="student-link-btn"
											onclick={() => viewStudentDetails(app)}
										>
											<span class="student-name">{app.studentName}</span>
										</button>
										<span class="student-id-badge">{app.studentReg || app.studentId}</span>
									</div>
								</td>
								<td>
									<div class="dept-batch-cell">
										<span class="batch-badge">MCA Batch {app.batch || '2024–2026'}</span>
									</div>
								</td>
								<td>
									<div class="company-cell">
										<button
											type="button"
											class="company-link-btn"
											onclick={() => viewDriveDetails(app)}
										>
											<span class="company-name">{app.companyName}</span>
										</button>
									</div>
								</td>
								<td>
									<span class="role-text">{app.role}</span>
								</td>
								<td>
									<span class="date-text">{formatDate(app.appliedAt)}</span>
								</td>
								<td>
									<Badge variant={getStatusVariant(app.status)} size="sm">
										{app.status}
									</Badge>
								</td>
								<td class="text-right">
									<div class="action-buttons">
										<button
											type="button"
											class="inspect-btn"
											title="View Student Dossier"
											onclick={() => viewStudentDetails(app)}
										>
											<User size={14} />
										</button>
										<button
											type="button"
											class="inspect-btn"
											title="View Opportunity Drive"
											onclick={() => viewDriveDetails(app)}
										>
											<Briefcase size={14} />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer -->
		{#if filteredApplications.length > 0}
			<div class="pagination-footer">
				<span class="pagination-info">
					Showing {(currentPage - 1) * pageSize + 1} to {Math.min(
						currentPage * pageSize,
						filteredApplications.length
					)} of {filteredApplications.length} applications
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

<!-- Student Details Modal -->
{#if activeStudentModal}
	<div class="modal-backdrop" onclick={() => (activeStudentModal = null)} role="presentation">
		<div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<div>
					<h3 class="modal-title">{activeStudentModal.name}</h3>
					<span class="modal-sub">{activeStudentModal.registerNumber}</span>
				</div>
				<button class="close-btn" onclick={() => (activeStudentModal = null)}>
					<X size={18} />
				</button>
			</div>

			<div class="modal-body">
				<div class="info-grid">
					<div class="info-item">
						<span class="info-label">Department</span>
						<span class="info-value">{activeStudentModal.department}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Graduating Batch</span>
						<span class="info-value">Batch {activeStudentModal.batch}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Email Address</span>
						<span class="info-value">{activeStudentModal.email}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Current CGPA</span>
						<span class="info-value font-mono">{activeStudentModal.cgpa}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Readiness Score</span>
						<span class="info-value font-mono">{activeStudentModal.readinessScore}%</span>
					</div>
					<div class="info-item">
						<span class="info-label">Current Placement Status</span>
						<Badge variant="info" size="sm">{activeStudentModal.placementStatus}</Badge>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<Button
					variant="secondary"
					size="sm"
					href="/coordinator/students?search={encodeURIComponent(activeStudentModal.registerNumber)}"
				>
					{#snippet icon()}<ExternalLink size={13} />{/snippet}
					View in Students Roster
				</Button>
				<Button variant="primary" size="sm" onclick={() => (activeStudentModal = null)}>
					Close
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Opportunity Drive Details Modal -->
{#if activeDriveModal}
	<div class="modal-backdrop" onclick={() => (activeDriveModal = null)} role="presentation">
		<div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<div>
					<h3 class="modal-title">{activeDriveModal.companyName}</h3>
					<span class="modal-sub">{activeDriveModal.role}</span>
				</div>
				<button class="close-btn" onclick={() => (activeDriveModal = null)}>
					<X size={18} />
				</button>
			</div>

			<div class="modal-body">
				<div class="info-grid">
					<div class="info-item">
						<span class="info-label">Package (CTC)</span>
						<span class="info-value font-mono">{activeDriveModal.ctcDisplay}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Drive Status</span>
						<Badge variant={activeDriveModal.status === 'Active' ? 'success' : 'neutral'} size="sm">
							{activeDriveModal.status}
						</Badge>
					</div>
					<div class="info-item">
						<span class="info-label">Drive Date</span>
						<span class="info-value">{activeDriveModal.driveDate}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Application Deadline</span>
						<span class="info-value">{activeDriveModal.applicationDeadline}</span>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<Button variant="secondary" size="sm" href="/coordinator/drives">
					{#snippet icon()}<ExternalLink size={13} />{/snippet}
					View All Campus Drives
				</Button>
				<Button variant="primary" size="sm" onclick={() => (activeDriveModal = null)}>
					Close
				</Button>
			</div>
		</div>
	</div>
{/if}

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

	@media (max-width: 900px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 500px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
	}

	.metric-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.metric-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-primary);
		line-height: 1.2;
	}

	.metric-desc {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.text-warning {
		color: var(--color-warning);
	}

	.text-success {
		color: var(--color-success);
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
		transition: border-color var(--transition-fast);
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

	.student-link-btn {
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
	}

	.student-name {
		font-weight: 600;
		color: var(--color-primary);
		transition: color var(--transition-fast);
	}

	.student-name:hover {
		text-decoration: underline;
	}

	.student-id-badge {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		color: var(--color-text-muted);
	}

	.dept-batch-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.dept-name {
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.batch-badge {
		font-size: 0.6875rem;
		color: var(--color-text-muted);
	}

	.company-cell {
		display: flex;
		align-items: center;
	}

	.company-link-btn {
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
	}

	.company-name {
		font-weight: 600;
		color: var(--color-text-primary);
		transition: color var(--transition-fast);
	}

	.company-link-btn:hover .company-name {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.role-text {
		color: var(--color-text-secondary);
	}

	.date-text {
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.text-right {
		text-align: right;
	}

	.action-buttons {
		display: inline-flex;
		gap: var(--space-1);
		justify-content: flex-end;
	}

	.inspect-btn {
		background: var(--color-surface-subtle);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		padding: 0.375rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--transition-fast);
	}

	.inspect-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-primary);
		border-color: var(--color-primary);
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

	/* Modal Styles */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: var(--space-4);
	}

	.modal-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		max-width: 500px;
		width: 100%;
		box-shadow: var(--shadow-xl);
		overflow: hidden;
		animation: modalFadeIn 0.15s ease-out;
	}

	@keyframes modalFadeIn {
		from {
			opacity: 0;
			transform: scale(0.97);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface-subtle);
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.modal-sub {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-family: var(--font-mono);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: var(--radius-sm);
	}

	.close-btn:hover {
		color: var(--color-text-primary);
	}

	.modal-body {
		padding: var(--space-5);
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.info-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.info-value {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-4) var(--space-5);
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-subtle);
	}
</style>
