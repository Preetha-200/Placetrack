<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { driveState } from '$lib/coordinator/driveState.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import CompanyModal, { type CompanyFormData } from '$lib/coordinator/components/CompanyModal.svelte';

	import Building2 from '@lucide/svelte/icons/building-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Globe from '@lucide/svelte/icons/globe';
	import Mail from '@lucide/svelte/icons/mail';
	import Phone from '@lucide/svelte/icons/phone';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Edit2 from '@lucide/svelte/icons/edit-2';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import Power from '@lucide/svelte/icons/power';
	import Award from '@lucide/svelte/icons/award';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Users from '@lucide/svelte/icons/users';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedTier = $state('all');
	let selectedStatus = $state('all');

	let isModalOpen = $state(false);
	let editingCompany = $state<CompanyFormData | null>(null);

	const analytics = $derived(data.analytics);
	const companyStatsMap = $derived.by(() => {
		const map = new Map<string, any>();
		if (analytics?.companyStatistics) {
			for (const stat of analytics.companyStatistics) {
				map.set(stat.companyId, stat);
				map.set(stat.companyName?.toLowerCase(), stat);
			}
		}
		return map;
	});

	const companies = $derived(data.companies || []);

	const filteredCompanies = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();

		return companies.filter((c: any) => {
			const matchesSearch =
				!query ||
				c.name.toLowerCase().includes(query) ||
				c.industry.toLowerCase().includes(query) ||
				(c.location && c.location.toLowerCase().includes(query));

			const matchesTier = selectedTier === 'all' || c.tier === selectedTier;
			const matchesStatus =
				selectedStatus === 'all' ||
				(selectedStatus === 'active' && c.isActive !== false) ||
				(selectedStatus === 'inactive' && c.isActive === false);

			return matchesSearch && matchesTier && matchesStatus;
		});
	});

	const totalCompaniesCount = $derived(companies.length);
	const activeCompaniesCount = $derived(companies.filter((c: any) => c.isActive !== false).length);
	const tier1Count = $derived(companies.filter((c: any) => c.tier === 'Tier-1').length);

	function getTierBadgeVariant(tier?: string): 'info' | 'success' | 'warning' | 'neutral' {
		if (tier === 'Tier-1') return 'success';
		if (tier === 'Tier-2') return 'info';
		if (tier === 'Tier-3') return 'neutral';
		return 'info';
	}

	function handleOpenAdd() {
		editingCompany = null;
		isModalOpen = true;
	}

	function handleOpenEdit(comp: any) {
		editingCompany = {
			id: comp.id,
			name: comp.name,
			industry: comp.industry,
			tier: comp.tier || 'Tier-2',
			website: comp.website || '',
			contactEmail: comp.contactEmail || '',
			contactPhone: comp.contactPhone || '',
			location: comp.location || '',
			isActive: comp.isActive !== false
		};
		isModalOpen = true;
	}

	async function handleSaveCompany(saved: CompanyFormData) {
		if (saved.id) {
			// Update
			const res = await fetch(`/api/coordinator/companies/${saved.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(saved)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to update company');
			}
			driveState.showToast(`${saved.name} updated successfully.`, 'success');
		} else {
			// Create
			const res = await fetch('/api/coordinator/companies', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(saved)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to add company');
			}
			driveState.showToast(`${saved.name} added to recruiting partners.`, 'success');
		}
		await invalidateAll();
	}

	async function handleToggleStatus(comp: any) {
		const newStatus = !comp.isActive;
		try {
			const res = await fetch(`/api/coordinator/companies/${comp.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: newStatus })
			});
			if (!res.ok) throw new Error('Failed to update company status');

			driveState.showToast(
				`${comp.name} is now ${newStatus ? 'active' : 'deactivated'}.`,
				newStatus ? 'success' : 'info'
			);
			await invalidateAll();
		} catch (err: any) {
			driveState.showToast(err.message || 'Action failed', 'error');
		}
	}

	function handleScheduleForCompany(comp: any) {
		driveState.company = comp.name;
		driveState.minPackage = comp.tier === 'Tier-1' ? 16 : comp.tier === 'Tier-3' ? 6 : 10;
		driveState.maxPackage = comp.tier === 'Tier-1' ? 24 : comp.tier === 'Tier-3' ? 8 : 15;
		driveState.openModal();
	}
</script>

<svelte:head>
	<title>Company Management | Placement Tracker Coordinator</title>
</svelte:head>

<div class="companies-page">
	{#snippet pageActions()}
		<Button variant="primary" size="sm" onclick={handleOpenAdd}>
			{#snippet icon()}
				<Plus size={16} />
			{/snippet}
			Add Partner Company
		</Button>
	{/snippet}

	<PageHeader
		title="Partner Companies & Recruiters"
		subtitle="Manage registered recruiting organizations, placement tiers, and campus hiring engagement."
		actions={pageActions}
	/>

	<!-- Top Metrics -->
	<section class="metrics-grid" aria-label="Company Statistics">
		{#snippet compIcon()}
			<Building2 size={22} />
		{/snippet}
		<StatCard
			label="Total Partner Companies"
			value={totalCompaniesCount}
			trend="Registered in Portal"
			trendType="neutral"
			icon={compIcon}
		/>

		{#snippet activeIcon()}
			<Users size={22} />
		{/snippet}
		<StatCard
			label="Active Recruiters"
			value={activeCompaniesCount}
			trend="{totalCompaniesCount > 0 ? Math.round((activeCompaniesCount / totalCompaniesCount) * 100) : 0}% active pool"
			trendType="positive"
			icon={activeIcon}
		/>

		{#snippet tierIcon()}
			<Award size={22} />
		{/snippet}
		<StatCard
			label="Tier-1 (Dream) Companies"
			value={tier1Count}
			trend="&gt; 15 LPA CTC"
			trendType="positive"
			icon={tierIcon}
		/>

		{#snippet ctcIcon()}
			<TrendingUp size={22} />
		{/snippet}
		<StatCard
			label="Peak Package Offered"
			value="{analytics?.overview?.highestCtc || 24} LPA"
			trend="Across active drives"
			trendType="positive"
			icon={ctcIcon}
		/>
	</section>

	<!-- Toolbar & Filters -->
	<div class="toolbar-card">
		<div class="search-wrap">
			<Search size={16} class="search-icon" />
			<input
				type="search"
				placeholder="Search company name, industry, or location..."
				aria-label="Search company name, industry, or location"
				class="search-input"
				bind:value={searchQuery}
			/>
		</div>

		<div class="filters-row">
			<div class="filter-group">
				<label for="tier-select" class="filter-label">Tier:</label>
				<select id="tier-select" class="filter-select" bind:value={selectedTier}>
					<option value="all">All Tiers ({companies.length})</option>
					<option value="Tier-1">Tier-1 (Dream &gt;15LPA)</option>
					<option value="Tier-2">Tier-2 (8 - 15 LPA)</option>
					<option value="Tier-3">Tier-3 (4 - 8 LPA)</option>
				</select>
			</div>

			<div class="filter-group">
				<label for="status-select" class="filter-label">Status:</label>
				<select id="status-select" class="filter-select" bind:value={selectedStatus}>
					<option value="all">All Statuses</option>
					<option value="active">Active Only</option>
					<option value="inactive">Deactivated Only</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Companies Grid -->
	{#if filteredCompanies.length === 0}
		{#snippet compEmptyIcon()}
			<Building2 size={32} />
		{/snippet}
		<Card padding="lg">
			<EmptyState
				title="No companies found"
				description={searchQuery || selectedTier !== 'all' || selectedStatus !== 'all'
					? 'No recruiting companies match your current search and filter criteria.'
					: 'Add your first recruiting partner company to schedule drives and receive candidate applications.'}
				icon={compEmptyIcon}
			>
				{#snippet action()}
					<Button variant="primary" size="sm" onclick={handleOpenAdd}>
						Add Company
					</Button>
				{/snippet}
			</EmptyState>
		</Card>
	{:else}
		<div class="companies-grid">
			{#each filteredCompanies as comp}
				{@const stats = companyStatsMap.get(comp.id) || companyStatsMap.get(comp.name.toLowerCase())}
				<div class="company-card {comp.isActive === false ? 'is-inactive' : ''}">
					<!-- Top Row -->
					<div class="comp-card-top">
						<div class="comp-avatar" aria-hidden="true">
							{comp.name
								.split(' ')
								.filter(Boolean)
								.map((n: string) => n[0])
								.join('')
								.substring(0, 2)
								.toUpperCase()}
						</div>

						<div class="comp-info-main">
							<div class="comp-title-row">
								<h3 class="comp-name">{comp.name}</h3>
								<Badge variant={comp.isActive !== false ? 'success' : 'neutral'} size="sm">
									{comp.isActive !== false ? 'Active' : 'Deactivated'}
								</Badge>
							</div>

							<div class="comp-badges-row">
								<Badge variant={getTierBadgeVariant(comp.tier)} size="sm">
									{comp.tier || 'Tier-2'}
								</Badge>
								<span class="industry-tag">{comp.industry}</span>
							</div>
						</div>
					</div>

					<!-- Details & Contact -->
					<div class="comp-details-list">
						{#if comp.location}
							<div class="detail-item">
								<MapPin size={13} />
								<span>{comp.location}</span>
							</div>
						{/if}

						{#if comp.website}
							<a href={comp.website} target="_blank" rel="noopener noreferrer" class="detail-item detail-link">
								<Globe size={13} />
								<span>{comp.website.replace(/^https?:\/\//, '')}</span>
							</a>
						{/if}

						{#if comp.contactEmail}
							<div class="detail-item">
								<Mail size={13} />
								<span>{comp.contactEmail}</span>
							</div>
						{/if}

						{#if comp.contactPhone}
							<div class="detail-item">
								<Phone size={13} />
								<span>{comp.contactPhone}</span>
							</div>
						{/if}
					</div>

					<!-- Stats Strip -->
					<div class="comp-stats-strip">
						<div class="mini-stat">
							<span class="mini-label">Drives</span>
							<strong class="mini-val">{stats?.drivesCount || 0}</strong>
						</div>
						<div class="mini-stat">
							<span class="mini-label">Applications</span>
							<strong class="mini-val">{stats?.applicationsCount || 0}</strong>
						</div>
						<div class="mini-stat">
							<span class="mini-label">Offers</span>
							<strong class="mini-val highlight">{stats?.offersCount || 0}</strong>
						</div>
						<div class="mini-stat">
							<span class="mini-label">Avg CTC</span>
							<strong class="mini-val">{stats?.avgCtc ? `${stats.avgCtc} LPA` : '-'}</strong>
						</div>
					</div>

					<!-- Card Actions -->
					<div class="comp-card-actions">
						<Button
							variant="secondary"
							size="sm"
							onclick={() => handleOpenEdit(comp)}
							title="Edit company profile"
						>
							{#snippet icon()}
								<Edit2 size={14} />
							{/snippet}
							Edit
						</Button>

						<Button
							variant="secondary"
							size="sm"
							onclick={() => handleScheduleForCompany(comp)}
							title="Schedule campus recruitment drive"
						>
							{#snippet icon()}
								<CalendarPlus size={14} />
							{/snippet}
							Schedule Drive
						</Button>

						<button
							type="button"
							class="toggle-status-btn {comp.isActive !== false ? 'btn-deactivate' : 'btn-activate'}"
							onclick={() => handleToggleStatus(comp)}
							title={comp.isActive !== false ? 'Deactivate company' : 'Activate company'}
						>
							<Power size={13} />
							<span>{comp.isActive !== false ? 'Deactivate' : 'Activate'}</span>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal -->
<CompanyModal
	open={isModalOpen}
	company={editingCompany}
	onclose={() => (isModalOpen = false)}
	onsave={handleSaveCompany}
/>

<style>
	.companies-page {
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

	.toolbar-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		flex-wrap: wrap;
		box-shadow: var(--shadow-sm);
	}

	.search-wrap {
		position: relative;
		flex: 1;
		min-width: 260px;
	}

	:global(.search-icon) {
		position: absolute;
		left: var(--space-3);
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: var(--space-2) var(--space-3) var(--space-2) var(--space-9);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		font-family: inherit;
		color: var(--text);
		outline: none;
		background: var(--surface);
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.search-input:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-100);
	}

	.filters-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.filter-label {
		font-size: var(--text-xs);
		color: var(--text-muted);
		font-weight: 500;
	}

	.filter-select {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		font-family: inherit;
		color: var(--text);
		background-color: var(--surface);
		outline: none;
		cursor: pointer;
	}

	.companies-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
		gap: var(--space-5);
	}

	.company-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		box-shadow: var(--shadow-sm);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.company-card:hover {
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}

	.company-card.is-inactive {
		opacity: 0.65;
		background-color: var(--surface-subtle);
	}

	.comp-card-top {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.comp-avatar {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		background: var(--primary-50);
		color: var(--primary);
		font-weight: 800;
		font-size: var(--text-md);
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border: 1px solid var(--primary-100);
	}

	.comp-info-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.comp-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.comp-name {
		font-size: var(--text-md);
		font-weight: 700;
		color: var(--text);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.comp-badges-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.industry-tag {
		font-size: var(--text-2xs);
		color: var(--text-secondary);
		background-color: var(--surface-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
	}

	.comp-details-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: var(--text-xs);
		color: var(--text-secondary);
		border-top: 1px solid var(--border-subtle);
		padding-top: var(--space-3);
	}

	.detail-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.detail-link {
		color: var(--primary);
		text-decoration: none;
	}

	.detail-link:hover {
		text-decoration: underline;
	}

	.comp-stats-strip {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-2);
		background-color: var(--surface-subtle);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-subtle);
	}

	.mini-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.mini-label {
		font-size: var(--text-3xs);
		color: var(--text-muted);
		text-transform: uppercase;
		font-weight: 600;
	}

	.mini-val {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--text);
	}

	.mini-val.highlight {
		color: var(--success-700);
	}

	.comp-card-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: auto;
		padding-top: var(--space-2);
		border-top: 1px solid var(--border-subtle);
	}

	.toggle-status-btn {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: 1px solid transparent;
		font-size: var(--text-2xs);
		font-weight: 600;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: all 0.15s ease;
	}

	.btn-deactivate {
		color: var(--danger-700);
		border-color: var(--danger-200);
		background-color: var(--danger-50);
	}

	.btn-deactivate:hover {
		background-color: var(--danger-100);
	}

	.btn-activate {
		color: var(--success-700);
		border-color: var(--success-200);
		background-color: var(--success-50);
	}

	.btn-activate:hover {
		background-color: var(--success-100);
	}

	@media (max-width: 1024px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.companies-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
