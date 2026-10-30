<script lang="ts">
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { checkAndEnforceSession, exitPortal } from '$lib/client/session';
	import { pageState } from '$lib/trainer/pageState.svelte';
	import {
		StudentDossierModal,
		AssignTaskModal,
		ReviewTaskModal,
		AssessmentBuilderModal,
		SubmissionsModal,
		AttemptBreakdownModal,
		UploadMaterialModal
	} from '$lib/trainer/components';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Users from '@lucide/svelte/icons/users';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import LogOut from '@lucide/svelte/icons/log-out';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let isMobileDrawerOpen = $state(false);
	let isLoggingOut = $state(false);
	let isBannerDismissed = $state(false);

	// Enforce session validity with server user confirmation
	$effect(() => {
		checkAndEnforceSession('trainer', !!data.user);
	});

	// Sync data into global pageState
	$effect(() => {
		pageState.init(data);
	});

	const currentPath = $derived(page.url.pathname);

	const pageTitle = $derived.by(() => {
		if (currentPath.startsWith('/trainer/students')) return 'Students';
		if (currentPath.startsWith('/trainer/assessments')) return 'Assessments';
		if (currentPath.startsWith('/trainer/tasks')) return 'Tasks';
		if (currentPath.startsWith('/trainer/materials')) return 'Study Materials';
		return 'Dashboard';
	});

	async function handleLogout() {
		isLoggingOut = true;
		await exitPortal('trainer');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isMobileDrawerOpen) {
			isMobileDrawerOpen = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="trainer-shell">
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
		class="trainer-sidebar {isMobileDrawerOpen ? 'drawer-open' : ''}"
		aria-label="Trainer Navigation"
	>
		<!-- Logo -->
		<div class="sidebar-header">
			<a href="/trainer/dashboard" class="brand-link" onclick={() => (isMobileDrawerOpen = false)}>
				<div class="brand-icon">P</div>
				<div class="brand-text">
					<span class="brand-title">Placement Tracker</span>
					<span class="brand-subtitle">Trainer Portal</span>
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
					href="/trainer/dashboard"
					class="nav-item {currentPath === '/trainer/dashboard' || currentPath === '/trainer' ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<LayoutDashboard size={18} />
					</span>
					<span class="nav-item-label">Dashboard</span>
				</a>
			</div>

			<!-- MANAGE -->
			<div class="nav-section">
				<span class="section-label">MANAGE</span>
				<a
					href="/trainer/students"
					class="nav-item {currentPath.startsWith('/trainer/students') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<Users size={18} />
					</span>
					<span class="nav-item-label">Students</span>
					{#if pageState.needsImprovementCount > 0}
						<span class="nav-badge warn">{pageState.needsImprovementCount}</span>
					{/if}
				</a>

				<a
					href="/trainer/assessments"
					class="nav-item {currentPath.startsWith('/trainer/assessments') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<ClipboardList size={18} />
					</span>
					<span class="nav-item-label">Assessments</span>
					{#if pageState.dbAssessments.length > 0}
						<span class="nav-badge">{pageState.dbAssessments.length}</span>
					{/if}
				</a>

				<a
					href="/trainer/tasks"
					class="nav-item {currentPath.startsWith('/trainer/tasks') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<ListChecks size={18} />
					</span>
					<span class="nav-item-label">Tasks</span>
					{#if pageState.pendingTasksCount > 0}
						<span class="nav-badge alert">{pageState.pendingTasksCount}</span>
					{/if}
				</a>

				<a
					href="/trainer/materials"
					class="nav-item {currentPath.startsWith('/trainer/materials') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<BookOpen size={18} />
					</span>
					<span class="nav-item-label">Study Materials</span>
				</a>
			</div>
		</nav>

		<!-- Sidebar Bottom: User Card & Logout -->
		<div class="sidebar-footer">
			<div class="user-card">
				<div class="user-avatar" aria-hidden="true">
					{(data.user?.name || 'DC')
						.split(' ')
						.map((n) => n[0])
						.join('')
						.substring(0, 2)
						.toUpperCase()}
				</div>
				<div class="user-info">
					<span class="user-name">{data.user?.name || 'Prof. David Chen'}</span>
					<span class="user-role">Trainer • MCA</span>
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
				<span>{isLoggingOut ? 'Exiting...' : 'Log out'}</span>
			</button>
		</div>
	</aside>

	<!-- Main Body Wrapper -->
	<div class="trainer-main-wrap">
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
					<span class="crumb-root">Trainer Portal</span>
					<span class="crumb-separator">/</span>
					<span class="crumb-current">{pageTitle}</span>
				</nav>
			</div>

			<div class="top-bar-right">
				<div class="top-avatar" title={data.user?.name || 'Trainer'}>
					{(data.user?.name || 'DC')
						.split(' ')
						.map((n) => n[0])
						.join('')
						.substring(0, 2)
						.toUpperCase()}
				</div>
			</div>
		</header>

		<!-- Page Content Container -->
		<main class="page-body">
			{#if data.loadError && !isBannerDismissed}
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

			{#if pageState.successNotification}
				<div class="alert-success" role="status">
					<span>{pageState.successNotification}</span>
				</div>
			{/if}

			{@render children()}
		</main>
	</div>

	<!-- Global Modals for Seamless Cross-Page Triggering -->
	<StudentDossierModal />
	<AssignTaskModal />
	<ReviewTaskModal />
	<AssessmentBuilderModal />
	<SubmissionsModal />
	<AttemptBreakdownModal />
	<UploadMaterialModal />
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	.trainer-shell {
		display: flex;
		min-height: 100vh;
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-sans);
	}

	/* Sidebar styling */
	.trainer-sidebar {
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
		gap: var(--space-2-5, 10px);
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
		top: var(--space-1-5, 6px);
		bottom: var(--space-1-5, 6px);
		width: 3px;
		background: var(--primary);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}

	.nav-item-icon {
		display: grid;
		place-items: center;
		color: currentColor;
	}

	.nav-item-label {
		flex: 1;
	}

	.nav-badge {
		font-size: var(--text-3xs);
		font-weight: 700;
		background: var(--slate-200);
		color: var(--slate-700);
		padding: 2px 6px;
		border-radius: var(--radius-full);
	}

	.nav-badge.warn {
		background: var(--danger-100);
		color: var(--danger-700);
	}

	.nav-badge.alert {
		background: var(--warning-100);
		color: var(--warning-700);
	}

	.sidebar-footer {
		padding: var(--space-3-5, 14px) var(--space-4);
		border-top: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: var(--space-2-5, 10px);
		background: var(--surface);
	}

	.user-card {
		display: flex;
		align-items: center;
		gap: var(--space-2-5, 10px);
	}

	.user-avatar {
		width: 34px;
		height: 34px;
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
		font-size: var(--text-3xs);
		color: var(--text-muted);
	}

	.logout-btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: none;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: var(--space-1-5, 6px) var(--space-3);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--danger);
		cursor: pointer;
		width: 100%;
		justify-content: center;
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
	.trainer-main-wrap {
		flex: 1;
		margin-left: 240px;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	/* Sticky Top Bar */
	.top-bar {
		height: 64px;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		padding: 0 var(--space-6);
		display: flex;
		align-items: center;
		justify-content: space-between;
		position: sticky;
		top: 0;
		z-index: 40;
	}

	.top-bar-left {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.mobile-menu-btn {
		display: none;
		background: none;
		border: 1px solid var(--border-strong);
		padding: var(--space-1-5, 6px);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		cursor: pointer;
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
		color: var(--border-strong);
	}

	.crumb-current {
		color: var(--text);
		font-weight: 700;
	}

	.top-bar-right {
		display: flex;
		align-items: center;
	}

	.top-avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background: var(--info-100);
		color: var(--info-700);
		font-size: var(--text-2xs);
		font-weight: 800;
		display: grid;
		place-items: center;
	}

	/* Page Body */
	.page-body {
		padding: var(--space-6);
		max-width: 1400px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.alert-success {
		background: var(--success-50);
		border: 1px solid var(--success-100);
		color: var(--success-700);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 700;
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
		backdrop-filter: blur(2px);
		z-index: 45;
		border: none;
		cursor: pointer;
	}

	@media (max-width: 900px) {
		.trainer-sidebar {
			transform: translateX(-100%);
			transition: transform 0.25s ease-out;
		}

		.trainer-sidebar.drawer-open {
			transform: translateX(0);
		}

		.mobile-close-btn {
			display: block;
		}

		.mobile-menu-btn {
			display: grid;
			place-items: center;
		}

		.trainer-main-wrap {
			margin-left: 0;
		}

		.top-bar {
			padding: 0 var(--space-4);
		}

		.page-body {
			padding: var(--space-4);
		}
	}
</style>
