<script lang="ts">
	import { untrack, onMount } from 'svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { studentStore } from '$lib/student/store.svelte';
	import { checkAndEnforceSession, exitPortal } from '$lib/client/session';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Calculator from '@lucide/svelte/icons/calculator';
	import Brain from '@lucide/svelte/icons/brain';
	import MessageSquareText from '@lucide/svelte/icons/message-square-text';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Code from '@lucide/svelte/icons/code';
	import Sigma from '@lucide/svelte/icons/sigma';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';

	let { data, children }: { data: LayoutData; children: any } = $props();
	let isLoggingOut = $state(false);
	let isMobileDrawerOpen = $state(false);

	// Load namespaced student state once on mount to avoid SSR / hydration mismatches
	onMount(() => {
		const userId = data.user?.id || 'usr_student_01';
		studentStore.init(userId);

		// If user is a database UUID user, sync server-persisted attempts to local store
		if (data.user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.user.id)) {
			fetch('/api/student/quiz-attempts')
				.then((res) => (res.ok ? res.json() : null))
				.then((json) => {
					if (json?.attempts && Array.isArray(json.attempts) && json.attempts.length > 0) {
						const existingIds = new Set(studentStore.history.map((h) => h.id));
						const newAttempts: any[] = [];
						for (const a of json.attempts) {
							if (!existingIds.has(a.id)) {
								newAttempts.push({
									id: a.id,
									category: a.category,
									categoryTitle: a.category === 'aptitude' ? 'Quantitative Aptitude' : a.category === 'verbal' ? 'Verbal Ability' : 'Logical Reasoning',
									levelBefore: a.levelBefore || 'Beginner',
									levelAfter: a.levelAfter || 'Beginner',
									score: a.score,
									totalQuestions: a.totalQuestions,
									percentage: a.percentage,
									passed: a.percentage >= 60,
									promoted: a.levelAfter !== a.levelBefore,
									timeSpentSeconds: a.timeSpentSeconds,
									date: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
									aiFeedback: `Completed on ${a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Recent'}`,
									improvementTips: [],
									answers: Array.isArray(a.answers) ? a.answers : []
								});
							}
						}
						if (newAttempts.length > 0) {
							studentStore.history = [...newAttempts, ...studentStore.history];
							studentStore.persist();
						}
					}
				})
				.catch((err) => console.warn('Could not load server quiz attempts:', err));
		}
	});

	// Enforce session validity: if tab was closed or opened without active session, exit
	$effect(() => {
		checkAndEnforceSession('student', !!data.user);
	});

	// Sync authenticated user info to reactive student store if present
	// Depends strictly on data.user and data.studentDetails without tracking store mutations
	$effect(() => {
		const user = data.user;
		const studentDetails = data.studentDetails;

		untrack(() => {
			if (user) {
				studentStore.syncUserAuth(user);
			}
			if (studentDetails) {
				studentStore.updateProfile({
					registerNumber: studentDetails.register_number,
					department: studentDetails.department,
					course: studentDetails.course,
					year: studentDetails.year,
					batch: studentDetails.batch,
					phone: studentDetails.phone || studentStore.profile.phone
				});
			}
		});
	});

	async function handleLogout() {
		isLoggingOut = true;
		await exitPortal('student');
	}

	const currentPath = $derived(page.url.pathname);

	// Close mobile drawer when route changes
	$effect(() => {
		// track currentPath and search params to auto-close drawer
		currentPath;
		page.url.search;
		isMobileDrawerOpen = false;
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isMobileDrawerOpen) {
			isMobileDrawerOpen = false;
		}
	}

	const currentPageTitle = $derived.by(() => {
		if (currentPath.startsWith('/student/aptitude')) return 'Aptitude';
		if (currentPath.startsWith('/student/logical-reasoning')) return 'Logical Reasoning';
		if (currentPath.startsWith('/student/verbal')) return 'Verbal Ability';
		if (currentPath.startsWith('/student/coding')) return 'Coding Practice';
		if (currentPath.startsWith('/student/assessments')) return 'Assessments';
		if (currentPath.startsWith('/student/materials')) return 'Study Materials';
		if (currentPath === '/student/profile' && page.url.searchParams.get('tab') === 'formulas') return 'Formulas';
		return 'Dashboard';
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="student-shell">
	<!-- Mobile Drawer Backdrop Overlay -->
	{#if isMobileDrawerOpen}
		<button
			type="button"
			class="mobile-backdrop"
			onclick={() => (isMobileDrawerOpen = false)}
			aria-label="Close navigation overlay"
		></button>
	{/if}

	<!-- Fixed Left Sidebar (Desktop: 240px, Mobile: Slide-in Drawer) -->
	<aside
		class="student-sidebar {isMobileDrawerOpen ? 'drawer-open' : ''}"
		aria-label="Student Navigation"
	>
		<!-- PlaceTrack Logo & Subtitle -->
		<div class="sidebar-header">
			<a href="/student/profile" class="brand-link" onclick={() => (isMobileDrawerOpen = false)}>
				<div class="brand-icon">P</div>
				<div class="brand-text">
					<span class="brand-title">Placement Tracker</span>
					<span class="brand-subtitle">Student Portal</span>
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

		<!-- Nav Groups: Overview, Practice, Resources -->
		<nav class="sidebar-nav">
			<!-- OVERVIEW SECTION -->
			<div class="nav-section">
				<span class="section-label">OVERVIEW</span>
				<a
					href="/student/profile"
					class="nav-item {(currentPath === '/student/profile' && page.url.searchParams.get('tab') !== 'formulas') || currentPath === '/student' || currentPath === '/student/dashboard' ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<LayoutDashboard size={18} />
					</span>
					<span class="nav-item-label">Dashboard</span>
				</a>
			</div>

			<!-- PRACTICE SECTION -->
			<div class="nav-section">
				<span class="section-label">PRACTICE</span>
				<a
					href="/student/aptitude"
					class="nav-item {currentPath.startsWith('/student/aptitude') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<Calculator size={18} />
					</span>
					<span class="nav-item-label">Aptitude</span>
				</a>
				<a
					href="/student/logical-reasoning"
					class="nav-item {currentPath.startsWith('/student/logical-reasoning') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<Brain size={18} />
					</span>
					<span class="nav-item-label">Logical Reasoning</span>
				</a>
				<a
					href="/student/verbal"
					class="nav-item {currentPath.startsWith('/student/verbal') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<MessageSquareText size={18} />
					</span>
					<span class="nav-item-label">Verbal Ability</span>
				</a>
				<a
					href="/student/coding"
					class="nav-item {currentPath.startsWith('/student/coding') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<Code size={18} />
					</span>
					<span class="nav-item-label">Coding Practice</span>
				</a>
				<a
					href="/student/assessments"
					class="nav-item {currentPath.startsWith('/student/assessments') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<ClipboardCheck size={18} />
					</span>
					<span class="nav-item-label">Assessments</span>
				</a>
			</div>

			<!-- RESOURCES SECTION -->
			<div class="nav-section">
				<span class="section-label">RESOURCES</span>
				<a
					href="/student/materials"
					class="nav-item {currentPath.startsWith('/student/materials') ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<BookOpen size={18} />
					</span>
					<span class="nav-item-label">Study Materials</span>
				</a>
				<a
					href="/student/profile?tab=formulas"
					class="nav-item {currentPath === '/student/profile' && page.url.searchParams.get('tab') === 'formulas' ? 'active' : ''}"
					onclick={() => (isMobileDrawerOpen = false)}
				>
					<span class="nav-item-icon">
						<Sigma size={18} />
					</span>
					<span class="nav-item-label">Formulas</span>
				</a>
			</div>
		</nav>

		<!-- Sidebar Bottom: User Card & Logout -->
		<div class="sidebar-footer">
			<a
				href="/student/profile"
				class="user-card"
				title="View Profile"
				onclick={() => (isMobileDrawerOpen = false)}
			>
				<div class="user-avatar" aria-hidden="true">
					{studentStore.profile.name
						? studentStore.profile.name.substring(0, 2).toUpperCase()
						: 'ST'}
				</div>
				<div class="user-info">
					<span class="user-name">{studentStore.profile.name || 'Alex Morgan'}</span>
					<div class="user-meta-row">
						<span class="user-reg">{studentStore.profile.registerNumber || 'Student'}</span>
						<span class="user-sep">•</span>
						<span class="user-readiness">{studentStore.overallReadinessScore !== null ? `${studentStore.overallReadinessScore}% Ready` : '--'}</span>
					</div>
				</div>
			</a>

			<button
				type="button"
				class="logout-button"
				onclick={handleLogout}
				disabled={isLoggingOut}
				title="Exit Portal"
			>
				<LogOut size={16} />
				<span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
			</button>
		</div>
	</aside>

	<!-- Content Main Column (Offset by 240px on Desktop) -->
	<div class="student-main-col">
		<!-- Top Bar: Sticky White Header -->
		<header class="student-topbar">
			<div class="topbar-left">
				<button
					type="button"
					class="mobile-hamburger-btn"
					onclick={() => (isMobileDrawerOpen = true)}
					aria-label="Open sidebar navigation"
				>
					<Menu size={20} />
				</button>

				<nav class="topbar-breadcrumb" aria-label="Breadcrumb">
					<span class="crumb-prefix">Student Portal</span>
					<span class="crumb-sep" aria-hidden="true">/</span>
					<span class="crumb-current">{currentPageTitle}</span>
				</nav>
			</div>

			<div class="topbar-right">
				<div class="topbar-badge" title="Placement Readiness Benchmark">
					<span class="readiness-dot" aria-hidden="true"></span>
					<span>{studentStore.overallReadinessScore !== null ? `${studentStore.overallReadinessScore}% Ready` : '--'}</span>
				</div>

				<a href="/student/profile" class="topbar-avatar" title="View Profile">
					{studentStore.profile.name
						? studentStore.profile.name.substring(0, 2).toUpperCase()
						: 'ST'}
				</a>
			</div>
		</header>

		<!-- Main Page Content Area -->
		<main class="student-content-area">
			<div class="student-content-container">
				{@render children()}
			</div>
		</main>
	</div>
</div>

<style>
	.student-shell {
		min-height: 100vh;
		display: flex;
		background-color: var(--bg);
		overflow-x: hidden;
	}

	/* ========================================================
	   1. FIXED SIDEBAR (240px on Desktop)
	   ======================================================== */
	.student-sidebar {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		width: 240px;
		background-color: var(--surface);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		z-index: 50;
		box-shadow: var(--shadow-sm);
	}

	/* Top Brand */
	.sidebar-header {
		height: 60px;
		padding: 0 var(--space-4);
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.brand-link {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		text-decoration: none;
		color: inherit;
	}

	.brand-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		background-color: var(--primary);
		color: var(--primary-foreground);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: var(--text-md);
		line-height: 1;
		flex-shrink: 0;
	}

	.brand-text {
		display: flex;
		flex-direction: column;
	}

	.brand-title {
		font-size: var(--text-base);
		font-weight: 700;
		color: var(--text);
		line-height: 1.15;
		letter-spacing: -0.01em;
	}

	.brand-subtitle {
		font-size: var(--text-2xs);
		font-weight: 500;
		color: var(--text-muted);
		line-height: 1.2;
	}

	.mobile-close-btn {
		display: none;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.mobile-close-btn:hover {
		background-color: var(--surface-subtle);
		color: var(--text);
	}

	/* Nav Sections */
	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4) 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.nav-section {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.section-label {
		padding: 0 var(--space-4) var(--space-1) var(--space-4);
		font-size: var(--text-2xs);
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-4);
		color: var(--text-secondary);
		text-decoration: none;
		font-size: var(--text-sm);
		line-height: var(--lh-sm);
		font-weight: 500;
		border-left: 3px solid transparent;
		transition: background-color 0.15s ease, color 0.15s ease, border-left-color 0.15s ease;
	}

	.nav-item:hover {
		background-color: var(--surface-subtle);
		color: var(--text);
	}

	.nav-item.active {
		background-color: var(--primary-50);
		color: var(--primary-600);
		font-weight: 600;
		border-left-color: var(--primary-600);
	}

	.nav-item-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.nav-item-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Sidebar Bottom Footer */
	.sidebar-footer {
		padding: var(--space-3) var(--space-4) var(--space-4) var(--space-4);
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		background-color: var(--surface);
		flex-shrink: 0;
	}

	.user-card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: background-color 0.15s ease;
	}

	.user-card:hover {
		background-color: var(--surface-subtle);
	}

	.user-avatar {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		background-color: var(--primary-100);
		color: var(--primary-700);
		font-size: var(--text-sm);
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	.user-name {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.25;
	}

	.user-meta-row {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-2xs);
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
	}

	.user-reg {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-sep {
		color: var(--slate-300);
	}

	.user-readiness {
		color: var(--success-700);
		font-weight: 600;
	}

	.logout-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		width: 100%;
		height: 34px;
		padding: 0 var(--space-3);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background-color: var(--surface);
		color: var(--slate-700);
		font-size: var(--text-xs);
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}

	.logout-button:hover:not(:disabled) {
		background-color: var(--danger-50);
		color: var(--danger);
		border-color: var(--danger-100);
	}

	.logout-button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	/* ========================================================
	   2. MAIN CONTENT COLUMN & TOPBAR
	   ======================================================== */
	.student-main-col {
		margin-left: 240px;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 100vh;
	}

	/* Sticky White Topbar */
	.student-topbar {
		position: sticky;
		top: 0;
		z-index: 30;
		height: 56px;
		background-color: var(--surface);
		border-bottom: 1px solid var(--border);
		box-shadow: var(--shadow-sm);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--space-6);
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.mobile-hamburger-btn {
		display: none;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background-color: var(--surface);
		color: var(--text-secondary);
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.mobile-hamburger-btn:hover {
		background-color: var(--surface-subtle);
		color: var(--text);
	}

	.topbar-breadcrumb {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		line-height: 1;
	}

	.crumb-prefix {
		color: var(--text-muted);
		font-weight: 500;
	}

	.crumb-sep {
		color: var(--slate-300);
		user-select: none;
	}

	.crumb-current {
		color: var(--text);
		font-weight: 600;
	}

	.topbar-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.topbar-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: var(--radius-full);
		background-color: var(--success-50);
		color: var(--success-700);
		border: 1px solid var(--success-100);
		font-size: var(--text-2xs);
		font-weight: 600;
		line-height: 1;
	}

	.readiness-dot {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		background-color: var(--success);
		flex-shrink: 0;
	}

	.topbar-avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background-color: var(--primary-50);
		color: var(--primary-700);
		border: 1px solid var(--primary-100);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-2xs);
		font-weight: 700;
		text-decoration: none;
		transition: transform 0.15s ease;
	}

	.topbar-avatar:hover {
		transform: scale(1.05);
	}

	/* Content View */
	.student-content-area {
		flex: 1;
		padding: var(--space-6);
		background-color: var(--bg);
	}

	.student-content-container {
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	/* Mobile Overlay */
	.mobile-backdrop {
		position: fixed;
		inset: 0;
		background: var(--overlay);
		backdrop-filter: blur(2px);
		z-index: 45;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	/* ========================================================
	   3. RESPONSIVE BREAKPOINT (<900px)
	   ======================================================== */
	@media (max-width: 900px) {
		.student-sidebar {
			transform: translateX(-100%);
			transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
			width: 270px;
			box-shadow: var(--shadow-lg);
		}

		.student-sidebar.drawer-open {
			transform: translateX(0);
		}

		.mobile-close-btn {
			display: flex;
		}

		.student-main-col {
			margin-left: 0;
		}

		.mobile-hamburger-btn {
			display: flex;
		}

		.student-topbar {
			padding: 0 var(--space-4);
		}

		.student-content-area {
			padding: var(--space-4);
		}
	}
</style>
