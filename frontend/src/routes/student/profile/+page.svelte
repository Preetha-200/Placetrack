<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { studentStore } from '$lib/student/store.svelte';
	import { PageHeader, Tabs, Button } from '$lib/components/ui';
	import {
		OverviewTab, SkillsTab, TasksTab, HistoryTab,
		FormulasTab, DossierTab, ProfileForm
	} from '$lib/student/components';
	import Pencil from '@lucide/svelte/icons/pencil';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';

	let { data }: { data: PageData } = $props();

	// Database-driven Student Dashboard Data
	const dbData = $derived(data.dashboardData);
	const overview = $derived(dbData?.overview);
	const skills = $derived(dbData?.skills);
	const analytics = $derived(dbData?.analytics);
	const weakAreas = $derived(dbData?.weakAreas);
	const recommendations = $derived(dbData?.recommendations);
	const history = $derived(dbData?.assessmentHistory || []);
	const studentHistoryItems = $derived(
		(studentStore.history || []).map((h) => ({
			id: h.id,
			title: `${h.categoryTitle} (${h.levelAfter})`,
			category: h.categoryTitle,
			submittedDate: h.date,
			submittedTime: 'Self-paced',
			score: h.score,
			maxScore: h.totalQuestions,
			percentage: h.percentage,
			resultStatus: h.passed ? 'Passed' : 'Needs Practice',
			timeSpentFormatted: `${Math.floor(h.timeSpentSeconds / 60)}m ${h.timeSpentSeconds % 60}s`
		}))
	);
	const activeHistoryList = $derived(history.length > 0 ? history : studentHistoryItems);

	// Error banner dismiss state
	let bannerDismissed = $state(false);

	// AI prediction state
	let customAiPrediction = $state<any | null>(null);
	const aiPrediction = $derived(customAiPrediction ?? dbData?.aiPrediction);
	let isEvaluatingAi = $state(false);
	let aiSuccessMessage = $state<string | null>(null);

	// Profile edit modal
	let isEditing = $state(false);
	let showToast = $state(false);

	// Tabs handling
	let activeTab = $state<string>('overview');
	const pendingTasksCount = $derived((studentStore.trainerTasks || []).filter((t) => t.status !== 'Completed').length);

	const tabItems = $derived([
		{ id: 'overview', label: 'Overview' },
		{ id: 'skills', label: 'Skills & Diagnostics' },
		{ id: 'tasks', label: 'Trainer Tasks', badge: pendingTasksCount > 0 ? pendingTasksCount : undefined },
		{ id: 'history', label: 'Quiz History', badge: activeHistoryList.length > 0 ? activeHistoryList.length : undefined },
		{ id: 'formulas', label: 'Formulas' },
		{ id: 'dossier', label: 'Academic Dossier' }
	]);

	function handleTabChange(tabId: string) {
		activeTab = tabId;
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.set('tab', tabId);
			goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	$effect(() => {
		const urlTab = page.url.searchParams.get('tab');
		if (urlTab) {
			const resolved = urlTab === 'analytics' ? 'skills' : urlTab;
			if (resolved !== activeTab && tabItems.some((t) => t.id === resolved)) {
				activeTab = resolved;
			}
		}
	});

	async function reEvaluateAi() {
		isEvaluatingAi = true;
		aiSuccessMessage = null;
		try {
			const res = await fetch('/api/ai/predict-readiness', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			const resJson = await res.json();
			if (res.ok && resJson.prediction) {
				customAiPrediction = resJson.prediction;
				aiSuccessMessage = 'AI Placement Readiness re-evaluated and persisted in PostgreSQL!';
				setTimeout(() => (aiSuccessMessage = null), 4500);
			}
		} catch (err: any) {
			console.error('Failed to re-evaluate AI readiness:', err);
		} finally {
			isEvaluatingAi = false;
		}
	}
</script>

<svelte:head>
	<title>Student Profile & Placement Readiness | Placement Tracker</title>
</svelte:head>

<div class="profile-page">
	{#if data.loadError && !bannerDismissed}
		<div class="db-error-banner" role="alert">
			<div class="banner-content">
				<TriangleAlert size={16} />
				<span>{data.loadError} Showing local offline profile data.</span>
			</div>
			<button
				type="button"
				class="banner-dismiss-btn"
				onclick={() => (bannerDismissed = true)}
				aria-label="Dismiss message"
			>
				<X size={14} />
			</button>
		</div>
	{/if}

	{#if showToast}
		<div class="toast-banner" role="status">
			<CircleCheck size={16} />
			<span>Profile information updated & saved permanently in PostgreSQL!</span>
		</div>
	{/if}

	{#if aiSuccessMessage}
		<div class="toast-banner ai-toast" role="status">
			<Sparkles size={16} />
			<span>{aiSuccessMessage}</span>
		</div>
	{/if}

	<PageHeader
		title={overview?.name ? `${overview.name}'s Profile` : 'Student Profile & Readiness'}
		subtitle="{overview?.department || 'Department of Computer Applications'} • {overview?.batch || 'Batch 2024-2026'}"
		breadcrumb={[{ label: 'Student', href: '/student/profile' }, { label: 'Profile' }]}
	>
		{#snippet actions()}
			<Button variant="secondary" size="sm" onclick={() => (isEditing = true)}>
				{#snippet icon()}<Pencil size={14} />{/snippet}
				Edit Profile
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Always render tabs and their respective content -->
	<Tabs tabs={tabItems} bind:activeTab onchange={handleTabChange}>
		{#if activeTab === 'overview'}
			<OverviewTab
				{overview}
				placementReadiness={dbData?.placementReadiness}
				{skills}
				{history}
				codingPerformance={dbData?.codingPerformance}
				placementDrives={dbData?.placementDrives}
				myApplications={dbData?.myApplications}
				myOffers={dbData?.myOffers}
				{weakAreas}
				{recommendations}
				{analytics}
				{aiPrediction}
				onOpenEdit={() => (isEditing = true)}
				onSwitchTab={handleTabChange}
				onReEvaluateAi={reEvaluateAi}
				{isEvaluatingAi}
			/>
		{:else if activeTab === 'skills'}
			<SkillsTab
				{skills}
				{analytics}
				{weakAreas}
				{recommendations}
				{aiPrediction}
				codingPerformance={dbData?.codingPerformance}
				onReEvaluateAi={reEvaluateAi}
				{isEvaluatingAi}
			/>
		{:else if activeTab === 'tasks'}
			<TasksTab />
		{:else if activeTab === 'history'}
			<HistoryTab
				history={activeHistoryList}
				codingPerformance={dbData?.codingPerformance}
			/>
		{:else if activeTab === 'formulas'}
			<FormulasTab />
		{:else if activeTab === 'dossier'}
			<DossierTab {overview} user={data.user} onOpenEdit={() => (isEditing = true)} />
		{/if}
	</Tabs>

	<ProfileForm
		bind:open={isEditing}
		initialData={{
			name: overview?.name || data.user?.name,
			phone: overview?.phone,
			bio: overview?.bio,
			targetRole: overview?.targetRole,
			targetCtc: overview?.targetCtc
		}}
		onSaveSuccess={(updated) => {
			if (overview) Object.assign(overview, updated);
			showToast = true;
			setTimeout(() => (showToast = false), 3500);
		}}
	/>
</div>

<style>
	.profile-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding-bottom: var(--space-8);
	}

	.db-error-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--warning-50);
		border: 1px solid var(--warning-200);
		color: var(--warning-800);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
		font-weight: 500;
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.banner-dismiss-btn {
		background: transparent;
		border: none;
		color: var(--warning-700);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
		border-radius: var(--radius-sm);
	}

	.banner-dismiss-btn:hover {
		background: var(--warning-100);
	}

	.toast-banner {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: var(--success-50);
		border: 1px solid var(--success-100);
		color: var(--success-700);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 500;
	}

	.toast-banner.ai-toast {
		background: var(--primary-50);
		border-color: var(--primary-200);
		color: var(--primary-700);
	}
</style>
