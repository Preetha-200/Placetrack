<script lang="ts">
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { checkAndEnforceSession, exitPortal } from '$lib/client/session';
	import { driveState } from '$lib/coordinator/driveState.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import ScheduleDriveModal from '$lib/coordinator/components/ScheduleDriveModal.svelte';

	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Award from '@lucide/svelte/icons/award';
	import Users from '@lucide/svelte/icons/users';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import LogOut from '@lucide/svelte/icons/log-out';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Info from '@lucide/svelte/icons/info';

	import FileText from '@lucide/svelte/icons/file-text';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let isMobileDrawerOpen = $state(false);
	let isLoggingOut = $state(false);
	let isBannerDismissed = $state(false);

	$effect(() => {
		checkAndEnforceSession('coordinator', !!data.user);
	});

	$effect(() => {
		if (data.analytics?.drives) {
			driveState.initDrives(data.analytics.drives);
		}
	});

	const currentPath = $derived(page.url.pathname);

	const pageTitle = $derived.by(() => {
		if (currentPath.startsWith('/coordinator/companies')) return 'Partner Companies';
		if (currentPath.startsWith('/coordinator/drives')) return 'MCA Campus Drives';
		if (currentPath.startsWith('/coordinator/placements')) return 'Offers & Trends';
		if (currentPath.startsWith('/coordinator/students')) return 'MCA Student Roster';
		if (currentPath.startsWith('/coordinator/applications')) return 'Student Applications';
		if (currentPath.startsWith('/coordinator/shortlisted')) return 'Shortlisted Candidates';
		if (currentPath.startsWith('/coordinator/offers')) return 'Confirmed Offers';
		if (currentPath.startsWith('/coordinator/placement-ready')) return 'Placement Ready Students';
		if (currentPath.startsWith('/coordinator/package-analytics')) return 'Package & Offer Analytics';
		if (currentPath.startsWith('/coordinator/departments')) return 'MCA Cohort Breakdown';
		return 'MCA Placement Dashboard';
	});

	const isLiveDb = $derived(data.analytics?.source === 'PostgreSQL' || data.analytics?.source === 'Cloud Firestore');

	async function handleLogout() {
		isLoggingOut = true;
		await exitPortal('coordinator');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isMobileDrawerOpen) {
			isMobileDrawerOpen = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="coordinator-shell">
	<!-- Mobile Overlay Backdrop -->
	{#if isMobileDrawerOpen}
		<button
			type="button"
			class="mobile-backdrop"
			onclick={() => (isMobileDrawerOpen = false)}
			aria-label="Close navigation overlay"
		></button>
	{/if}

	<!-- Fixed Left Sidebar (240px) -->
	<aside
		class="coordinator-sidebar {isMobileDrawerOpen ? 'drawer-open' : ''}"
		aria-label="Coordinator Navigation"
	>
		<!-- Logo -->
		<div class="sidebar-header">
			<a href="/coordinator/dashboard" class="brand-link" onclick={() => (isMobileDrawerOpen = false)}>
				<div class="brand-icon">P</div>
				<div class="brand-text">
					<span class="brand-title">MCA Placement Tracker</span>
					<span class="brand-subtitle">MCA Department</span>
				</div>
			</a>

			<button
				type="button"
				class="mobile-close-btn"
				onclick={() => (isMobileDrawerOpen = false)}
				aria-label="Close menu"
			>
				<X size={18} />
			</button>
		</div>

		<!-- Nav Groups -->
		<nav class="sidebar-nav">
			<!-- OVERVIEW -->
			<div class="nav-section">
				<span class="section-label">OVERVIEW</span>
				<a
					href="/coordinator/dashboard"
					class="nav-item {currentPath === '/coordinator/dashboard' || currentPath === '/coordinator' ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<LayoutDashboard size={18} />
					</span>
					<span class="nav-item-label">Dashboard</span>
				</a>

				<a
					href="/coordinator/students"
					class="nav-item {currentPath.startsWith('/coordinator/students') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<Users size={18} />
					</span>
					<span class="nav-item-label">MCA Roster</span>
				</a>

				<a
					href="/coordinator/applications"
					class="nav-item {currentPath.startsWith('/coordinator/applications') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<FileText size={18} />
					</span>
					<span class="nav-item-label">Applications</span>
				</a>
			</div>

			<!-- RECRUITMENT -->
			<div class="nav-section">
				<span class="section-label">RECRUITMENT</span>
				<a
					href="/coordinator/companies"
					class="nav-item {currentPath.startsWith('/coordinator/companies') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<Building2 size={18} />
					</span>
					<span class="nav-item-label">Companies</span>
				</a>

				<a
					href="/coordinator/drives"
					class="nav-item {currentPath.startsWith('/coordinator/drives') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<Briefcase size={18} />
					</span>
					<span class="nav-item-label">Campus Drives</span>
				</a>

				<a
					href="/coordinator/offers"
					class="nav-item {currentPath.startsWith('/coordinator/offers') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<Award size={18} />
					</span>
					<span class="nav-item-label">Confirmed Offers</span>
				</a>
			</div>

			<!-- ANALYTICS -->
			<div class="nav-section">
				<span class="section-label">ANALYTICS</span>
				<a
					href="/coordinator/package-analytics"
					class="nav-item {currentPath.startsWith('/coordinator/package-analytics') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<TrendingUp size={18} />
					</span>
					<span class="nav-item-label">Package Analytics</span>
				</a>

				<a
					href="/coordinator/placements"
					class="nav-item {currentPath.startsWith('/coordinator/placements') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<Award size={18} />
					</span>
					<span class="nav-item-label">Offers & Trends</span>
				</a>

				<a
					href="/coordinator/departments"
					class="nav-item {currentPath.startsWith('/coordinator/departments') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<GraduationCap size={18} />
					</span>
					<span class="nav-item-label">MCA Cohort Stats</span>
				</a>
			</div>
		</nav>

		<!-- Sidebar Bottom: User Card & Logout -->
		<div class="sidebar-footer">
			<div class="user-card">
				<div class="user-avatar" aria-hidden="true">
					{(data.user?.name || 'Dr. Sarah Jenkins')
						.split(' ')
						.filter(Boolean)
						.map((n) => n[0])
						.join('')
						.substring(0, 2)
						.toUpperCase()}
				</div>
				<div class="user-info">
					<span class="user-name">{data.user?.name || 'Dr. Sarah Jenkins'}</span>
					<span class="user-role">Placement Coordinator</span>
				</div>
			</div>

			<button
				type="button"
				class="logout-btn"
				onclick={handleLogout}
				disabled={isLoggingOut}
				title="Log Out"
			>
				<LogOut size={16} />
				<span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
			</button>
		</div>
	</aside>

	<!-- Main Body Wrapper -->
	<div class="coordinator-main-wrap">
		<!-- Sticky Top Bar -->
		<header class="top-bar">
			<div class="top-bar-left">
				<button
					type="button"
					class="mobile-menu-btn"
					onclick={() => (isMobileDrawerOpen = true)}
					aria-label="Open navigation menu"
				>
					<Menu size={20} />
				</button>

				<nav class="breadcrumbs" aria-label="Breadcrumb">
					<span class="crumb-root">Coordinator</span>
					<span class="crumb-separator">/</span>
					<span class="crumb-current">{pageTitle}</span>
				</nav>
			</div>

			<div class="top-bar-right">
				{#if isLiveDb}
					<Badge variant="success" size="sm">Live database</Badge>
				{:else if data.analytics?.source === 'Unavailable' || data.loadError}
					<Badge variant="warning" size="sm">Database Unavailable</Badge>
				{:else}
					<Badge variant="warning" size="sm">Demo data</Badge>
				{/if}
			</div>
		</header>

		<!-- Page Content Container -->
		<main class="page-body">
			{#if (data.loadError || data.analytics?.source === 'Unavailable') && !isBannerDismissed}
				<div class="db-error-banner" role="alert">
					<div class="banner-content">
						<AlertCircle size={18} class="banner-icon" />
						<span>Could not reach the database, showing no data</span>
					</div>
					<button
						type="button"
						class="banner-dismiss-btn"
						onclick={() => (isBannerDismissed = true)}
						aria-label="Dismiss banner"
					>
						<X size={16} />
					</button>
				</div>
			{/if}

			{@render children()}
		</main>
	</div>

	<!-- Global Toast Notification -->
	{#if driveState.toast.show}
		<div class="toast-container" role="status" aria-live="polite">
			<div class="toast-card toast-{driveState.toast.type}">
				<div class="toast-icon">
					{#if driveState.toast.type === 'success'}
						<CheckCircle2 size={16} />
					{:else if driveState.toast.type === 'error'}
						<AlertCircle size={16} />
					{:else}
						<Info size={16} />
					{/if}
				</div>
				<div class="toast-message">
					{driveState.toast.message}
				</div>
				<button
					type="button"
					class="toast-close-btn"
					onclick={() => driveState.hideToast()}
					aria-label="Dismiss notification"
				>
					<X size={14} />
				</button>
			</div>
		</div>
	{/if}

	<!-- Global Schedule Drive Modal -->
	<ScheduleDriveModal />
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	.coordinator-shell {
		display: flex;
		min-height: 100vh;
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-sans);
	}

	/* Fixed Left Sidebar (240px) */
	.coordinator-sidebar {
		width: 240px;
		background: var(--surface);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		z-index: 50;
	}

	.sidebar-header {
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--space-4);
		border-bottom: 1px solid var(--border-subtle);
	}

	.brand-link {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		text-decoration: none;
		color: inherit;
	}

	.brand-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		background: var(--primary);
		color: var(--primary-foreground);
		font-weight: 800;
		font-size: var(--text-md);
		display: grid;
		place-items: center;
	}

	.brand-text {
		display: flex;
		flex-direction: column;
	}

	.brand-title {
		font-size: var(--text-base);
		font-weight: 800;
		color: var(--text);
		line-height: var(--lh-xs);
	}

	.brand-subtitle {
		font-size: var(--text-2xs);
		color: var(--text-muted);
		font-weight: 600;
	}

	.mobile-close-btn {
		display: none;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: var(--space-1);
	}

	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4) var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.nav-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.section-label {
		font-size: var(--text-3xs);
		font-weight: 800;
		color: var(--slate-400);
		letter-spacing: 0.05em;
		padding: var(--space-1) var(--space-3);
		text-transform: uppercase;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		text-decoration: none;
		color: var(--text-secondary);
		font-size: var(--text-sm);
		font-weight: 600;
		transition: all 0.15s ease;
		position: relative;
	}

	.nav-item:hover {
		background: var(--surface-subtle);
		color: var(--primary);
	}

	.nav-item.active {
		background: var(--primary-50);
		color: var(--primary);
		font-weight: 700;
	}

	.nav-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: var(--space-1);
		bottom: var(--space-1);
		width: 3px;
		background: var(--primary);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}

	.nav-item-icon {
		display: grid;
		place-items: center;
		color: inherit;
		flex-shrink: 0;
	}

	.nav-item-label {
		flex: 1;
	}

	/* Sidebar Footer */
	.sidebar-footer {
		padding: var(--space-3);
		border-top: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.user-card {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2);
		border-radius: var(--radius-sm);
		background: var(--surface-subtle);
	}

	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background: var(--primary);
		color: var(--primary-foreground);
		font-weight: 700;
		font-size: var(--text-xs);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.user-name {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-role {
		font-size: var(--text-2xs);
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.logout-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-2);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--danger-700);
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.logout-btn:hover:not(:disabled) {
		background: var(--danger-50);
		border-color: var(--danger-100);
	}

	.logout-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Main Body Wrapper */
	.coordinator-main-wrap {
		flex: 1;
		margin-left: 240px;
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 100vh;
	}

	/* Sticky Top Bar */
	.top-bar {
		height: 64px;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--space-6);
		position: sticky;
		top: 0;
		z-index: 40;
	}

	.top-bar-left {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.mobile-menu-btn {
		display: none;
		background: none;
		border: none;
		color: var(--text);
		cursor: pointer;
		padding: var(--space-1);
	}

	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
	}

	.crumb-root {
		color: var(--text-muted);
		font-weight: 500;
	}

	.crumb-separator {
		color: var(--slate-300);
		font-size: var(--text-xs);
	}

	.crumb-current {
		color: var(--text);
		font-weight: 700;
	}

	.top-bar-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	/* Page Body */
	.page-body {
		flex: 1;
		padding: var(--space-6);
		max-width: 1280px;
		width: 100%;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	/* Toast Notification */
	.toast-container {
		position: fixed;
		bottom: var(--space-6);
		right: var(--space-6);
		z-index: 1100;
		animation: toastSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.toast-card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		min-width: 300px;
		max-width: 440px;
	}

	.toast-success {
		background-color: var(--surface);
		border: 1px solid var(--success-100);
		color: var(--text);
	}

	.toast-success .toast-icon {
		color: var(--success);
	}

	.toast-error {
		background-color: var(--surface);
		border: 1px solid var(--danger-100);
		color: var(--text);
	}

	.toast-error .toast-icon {
		color: var(--danger);
	}

	.toast-info {
		background-color: var(--surface);
		border: 1px solid var(--info-100);
		color: var(--text);
	}

	.toast-info .toast-icon {
		color: var(--info);
	}

	.toast-icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.toast-message {
		font-size: var(--text-xs);
		font-weight: 600;
		flex: 1;
	}

	.toast-close-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 2px;
		display: flex;
		align-items: center;
		border-radius: var(--radius-sm);
		transition: color 0.15s ease;
	}

	.toast-close-btn:hover {
		color: var(--text);
	}

	@keyframes toastSlideUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.db-error-banner {
		background: #fffbeb;
		border: 1px solid #fde68a;
		color: #92400e;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.banner-dismiss-btn {
		background: none;
		border: none;
		color: #92400e;
		cursor: pointer;
		display: flex;
		align-items: center;
		padding: 2px;
		border-radius: var(--radius-sm);
		transition: opacity 0.15s ease;
	}

	.banner-dismiss-btn:hover {
		opacity: 0.7;
	}


	/* Mobile Overlay */
	.mobile-backdrop {
		position: fixed;
		inset: 0;
		background: var(--overlay);
		z-index: 90;
		border: none;
		cursor: pointer;
	}

	/* Responsive */
	@media (max-width: 900px) {
		.coordinator-sidebar {
			transform: translateX(-100%);
			transition: transform 0.25s ease-in-out;
			z-index: 100;
			box-shadow: var(--shadow-lg);
		}

		.coordinator-sidebar.drawer-open {
			transform: translateX(0);
		}

		.mobile-close-btn {
			display: block;
		}

		.coordinator-main-wrap {
			margin-left: 0;
		}

		.mobile-menu-btn {
			display: block;
		}

		.top-bar {
			padding: 0 var(--space-4);
		}

		.page-body {
			padding: var(--space-4);
		}
	}
</style>
