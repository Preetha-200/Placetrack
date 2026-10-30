<script lang="ts">
	import type { PageData } from './$types';
	import { onDestroy } from 'svelte';
	import {
		PageHeader,
		StatCard,
		Tabs,
		Card,
		EmptyState
	} from '$lib/components/ui';
	import {
		AssessmentCard,
		AssessmentRunner,
		AssessmentReview
	} from '$lib/student/components';
	import Clock from '@lucide/svelte/icons/clock';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Award from '@lucide/svelte/icons/award';
	import Play from '@lucide/svelte/icons/play';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';

	let { data }: { data: PageData } = $props();

	// Reactive Assessments list
	let customAssessments = $state<any[] | null>(null);
	const assessments = $derived(customAssessments ?? data.assessments ?? []);
	let activeTab = $state<'upcoming' | 'in_progress' | 'completed'>('upcoming');

	// Active Assessment Runner State
	let isRunning = $state(false);
	let isSubmitting = $state(false);
	let activeAssessmentId = $state<string | null>(null);
	let activeAttemptId = $state<string | null>(null);
	let assessmentTitle = $state('');
	let assessmentCategory = $state('');
	let questions = $state<any[]>([]);
	let currentQuestionIndex = $state(0);
	let selectedAnswers = $state<Record<string, string>>({});
	let remainingSeconds = $state(0);
	let timerInterval: any = null;
	let timeSpentSeconds = $state(0);

	// Results & Review View State
	let resultView = $state<any | null>(null);
	let reviewQuestions = $state<any[]>([]);

	// Notification Toast
	let toastMessage = $state<string | null>(null);

	function showToast(msg: string) {
		toastMessage = msg;
		setTimeout(() => {
			toastMessage = null;
		}, 4000);
	}

	// Stats Calculation
	const activeCount = $derived(
		assessments.filter((a) => a.attemptStatus !== 'Completed').length
	);
	const inProgressCount = $derived(
		assessments.filter((a) => a.attemptStatus === 'In Progress').length
	);
	const completedAssessments = $derived(
		assessments.filter((a) => a.attemptStatus === 'Completed')
	);
	const completedCount = $derived(completedAssessments.length);
	const upcomingCount = $derived(
		assessments.filter((a) => a.attemptStatus !== 'In Progress' && a.attemptStatus !== 'Completed').length
	);

	const averageScore = $derived.by(() => {
		if (completedCount === 0) return 'N/A';
		const sum = completedAssessments.reduce((acc, a) => acc + (a.percentage || 0), 0);
		return `${Math.round(sum / completedCount)}%`;
	});

	// Tab Definitions
	const tabItems = $derived([
		{ id: 'upcoming', label: 'Upcoming', badge: upcomingCount > 0 ? upcomingCount : undefined },
		{ id: 'in_progress', label: 'In Progress', badge: inProgressCount > 0 ? inProgressCount : undefined },
		{ id: 'completed', label: 'Completed', badge: completedCount > 0 ? completedCount : undefined }
	]);

	// Filtered list per active tab
	const displayedAssessments = $derived.by(() => {
		if (activeTab === 'in_progress') {
			return assessments.filter((a) => a.attemptStatus === 'In Progress');
		} else if (activeTab === 'completed') {
			return assessments.filter((a) => a.attemptStatus === 'Completed');
		} else {
			return assessments.filter(
				(a) => a.attemptStatus !== 'In Progress' && a.attemptStatus !== 'Completed'
			);
		}
	});

	const currentQuestion = $derived(
		questions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < questions.length
			? questions[currentQuestionIndex]
			: null
	);

	// 1. Start or Resume Assessment
	async function handleStartAssessment(asm: any) {
		try {
			const res = await fetch(`/api/assessments/${asm.id}/start`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			const resData = await res.json();
			if (!res.ok) {
				showToast(resData.message || 'Failed to start assessment');
				return;
			}

			const attempt = resData.attempt;
			activeAssessmentId = asm.id;
			activeAttemptId = attempt.attemptId;
			assessmentTitle = attempt.assessmentTitle;
			assessmentCategory = attempt.category;
			questions = attempt.questions || [];
			selectedAnswers = attempt.existingAnswers || {};
			currentQuestionIndex = 0;
			timeSpentSeconds = 0;

			const durationSec = (attempt.durationMinutes || 20) * 60;
			remainingSeconds = durationSec;

			if (timerInterval) clearInterval(timerInterval);
			timerInterval = setInterval(() => {
				remainingSeconds -= 1;
				timeSpentSeconds += 1;
				if (remainingSeconds <= 0) {
					clearInterval(timerInterval);
					submitAssessment(true);
				}
			}, 1000);

			isRunning = true;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch (err: any) {
			showToast('Network error starting assessment: ' + err.message);
		}
	}

	function selectOption(questionId: string, optionKey: string) {
		selectedAnswers = {
			...selectedAnswers,
			[questionId]: optionKey
		};
	}

	function goToPrevQuestion() {
		if (currentQuestionIndex > 0) currentQuestionIndex -= 1;
	}

	function goToNextQuestion() {
		if (currentQuestionIndex < questions.length - 1) currentQuestionIndex += 1;
	}

	function jumpToQuestion(idx: number) {
		if (idx >= 0 && idx < questions.length) currentQuestionIndex = idx;
	}

	// Submit Assessment
	async function submitAssessment(isAutoSubmit = false) {
		if (isSubmitting) return;
		isSubmitting = true;

		if (timerInterval) clearInterval(timerInterval);

		try {
			const res = await fetch(`/api/assessments/${activeAssessmentId}/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					attemptId: activeAttemptId,
					answers: selectedAnswers,
					timeSpentSeconds
				})
			});

			const payload = await res.json();
			if (!res.ok) {
				showToast(payload.message || 'Submission error');
				isSubmitting = false;
				return;
			}

			isRunning = false;
			resultView = payload.result;
			reviewQuestions = payload.result.questions || [];

			// Update the local assessment entry
			customAssessments = assessments.map((a) => {
				if (a.id === activeAssessmentId) {
					return {
						...a,
						attemptStatus: 'Completed',
						score: payload.result.score,
						maxScore: payload.result.maxScore,
						percentage: payload.result.percentage
					};
				}
				return a;
			});

			showToast(
				isAutoSubmit
					? 'Time expired! Assessment auto-submitted.'
					: 'Assessment submitted successfully!'
			);
		} catch (err: any) {
			showToast('Submission failed: ' + err.message);
		} finally {
			isSubmitting = false;
		}
	}

	async function viewAttemptReview(asm: any) {
		if (!asm.attemptId) return;
		try {
			const res = await fetch(`/api/assessments/attempts/${asm.attemptId}`);
			const resData = await res.json();
			if (!res.ok) {
				showToast(resData.message || 'Unable to load review');
				return;
			}

			resultView = {
				assessmentTitle: resData.attempt.assessment_title,
				category: resData.attempt.assessment_category,
				score: resData.attempt.score,
				maxScore: resData.attempt.max_score,
				percentage: resData.attempt.percentage,
				timeSpentSeconds: resData.attempt.time_spent_seconds,
				submittedAt: resData.attempt.submitted_at
			};
			reviewQuestions = resData.breakdown || [];
		} catch (err: any) {
			showToast('Error loading attempt review: ' + err.message);
		}
	}

	function closeReview() {
		resultView = null;
		reviewQuestions = [];
	}

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
	});
</script>

<svelte:head>
	<title>Assigned Assessments | Placement Tracker</title>
</svelte:head>

<div class="assessments-page">
	{#if toastMessage}
		<div class="toast-bar" role="status">
			<CircleCheck size={16} />
			<span>{toastMessage}</span>
		</div>
	{/if}

	{#if isRunning && currentQuestion}
		<AssessmentRunner
			{assessmentTitle}
			{assessmentCategory}
			{questions}
			bind:currentQuestionIndex
			{selectedAnswers}
			{remainingSeconds}
			{isSubmitting}
			onSelectOption={selectOption}
			onPrev={goToPrevQuestion}
			onNext={goToNextQuestion}
			onJump={jumpToQuestion}
			onSubmit={() => submitAssessment(false)}
		/>
	{:else if resultView}
		<AssessmentReview
			{resultView}
			{reviewQuestions}
			onClose={closeReview}
		/>
	{:else}
		<!-- Header & 3 StatCards -->
		<PageHeader
			title="Assigned Assessments"
			subtitle="Official domain tests scheduled by faculty trainers. Scores are recorded in PostgreSQL and update placement readiness."
			breadcrumb={[
				{ label: 'Student', href: '/student/profile' },
				{ label: 'Assessments' }
			]}
		/>

		<!-- 3 StatCards: Active, Completed, Average Score -->
		<section class="statcards-grid" aria-label="Assessment performance metrics">
			<StatCard
				label="Active Assessments"
				value={activeCount}
				trend={inProgressCount > 0 ? `${inProgressCount} In Progress` : 'All Caught Up'}
				trendType={inProgressCount > 0 ? 'neutral' : 'positive'}
			>
				{#snippet icon()}
					<Clock size={20} />
				{/snippet}
			</StatCard>

			<StatCard
				label="Completed Assessments"
				value={completedCount}
				trend="{assessments.length > 0 ? Math.round((completedCount / assessments.length) * 100) : 0}% Target Met"
				trendType="positive"
			>
				{#snippet icon()}
					<CircleCheck size={20} />
				{/snippet}
			</StatCard>

			<StatCard
				label="Average Score"
				value={averageScore}
				trend="Benchmark: 75%"
				trendType="neutral"
			>
				{#snippet icon()}
					<Award size={20} />
				{/snippet}
			</StatCard>
		</section>

		<!-- Tabs: Upcoming / In Progress / Completed -->
		<Tabs tabs={tabItems} bind:activeTab>
			{#if displayedAssessments.length === 0}
				<Card>
					{#if activeTab === 'upcoming'}
						<EmptyState
							title="No upcoming assessments"
							description="You have no pending assessments awaiting completion. Excellent job staying ahead of schedule!"
						>
							{#snippet icon()}
								<ClipboardCheck size={36} />
							{/snippet}
						</EmptyState>
					{:else if activeTab === 'in_progress'}
						<EmptyState
							title="No assessments in progress"
							description="You have no paused or active assessment sessions. Click 'Start Assessment' from Upcoming to begin."
						>
							{#snippet icon()}
								<Play size={36} />
							{/snippet}
						</EmptyState>
					{:else}
						<EmptyState
							title="No completed assessments yet"
							description="Complete assigned assessments to review verified test marks, question breakdowns, and solutions."
						>
							{#snippet icon()}
								<Award size={36} />
							{/snippet}
						</EmptyState>
					{/if}
				</Card>
			{:else}
				<div class="assessments-list">
					{#each displayedAssessments as asm (asm.id)}
						<AssessmentCard
							assessment={asm}
							onStart={handleStartAssessment}
							onReview={viewAttemptReview}
						/>
					{/each}
				</div>
			{/if}
		</Tabs>
	{/if}
</div>

<style>
	.assessments-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding-bottom: var(--space-8);
	}

	.toast-bar {
		position: fixed;
		bottom: var(--space-4);
		right: var(--space-4);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border);
		border-left: 4px solid var(--success-500);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 500;
		box-shadow: var(--shadow-md);
		z-index: 1000;
	}

	.statcards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-3);
	}

	.assessments-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
</style>
