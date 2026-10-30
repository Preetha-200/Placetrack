<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import {
		CODING_PROBLEMS,
		CODING_TOPICS,
		type CodingProblem,
		type CodingLanguage,
		type ProblemDifficulty
	} from '$lib/student/codingProblemsData';
	import {
		CodeEditor,
		ProblemStatement,
		ConsoleDrawer,
		AICodingAssistantDrawer,
		AICodingQuizModal
	} from '$lib/student/components';
	import { PageHeader, Badge, Button, Card } from '$lib/components/ui';
	import type { ExecutionResult, BatchSubmissionResult } from '$lib/server/services/codeExecution';

	// Lucide Icons
	import Play from '@lucide/svelte/icons/play';
	import Send from '@lucide/svelte/icons/send';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Search from '@lucide/svelte/icons/search';
	import Filter from '@lucide/svelte/icons/filter';
	import Code from '@lucide/svelte/icons/code';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import List from '@lucide/svelte/icons/list';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Brain from '@lucide/svelte/icons/brain';
	import Bot from '@lucide/svelte/icons/bot';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data }: { data: PageData } = $props();

	// Selected Problem & Language
	let selectedProblemId = $state<string>('prob-arr-04');
	let selectedLanguage = $state<CodingLanguage>('python');

	$effect(() => {
		if (data.initialProblemId) {
			selectedProblemId = data.initialProblemId;
		}
	});

	const currentProblem = $derived(
		CODING_PROBLEMS.find((p) => p.id === selectedProblemId) || CODING_PROBLEMS[0]
	);

	// Filter & Search State
	let searchQuery = $state('');
	let selectedTopicFilter = $state<string>('all');
	let selectedDifficultyFilter = $state<string>('all');
	let isProblemDrawerOpen = $state(false);
	let activeLeftTab = $state<'question' | 'ai'>('question');
	let isQuizModalOpen = $state(false);

	// Code State per Problem + Language Cache
	let codeCache = $state<Record<string, string>>({});
	let currentCode = $state<string>('');

	// Execution & Console State
	let activeConsoleTab = $state<'testcases' | 'custom_input' | 'output' | 'history'>('testcases');
	let isExecuting = $state(false);
	let customStdin = $state('');
	let executionResult = $state<ExecutionResult | null>(null);
	let submissionResult = $state<BatchSubmissionResult | null>(null);
	let allSubmissions = $state<any[]>([]);
	let notificationMessage = $state<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

	$effect(() => {
		if (data.userSubmissions) {
			allSubmissions = data.userSubmissions;
		}
	});

	// Filtered problem list
	const filteredProblems = $derived.by(() => {
		let list = CODING_PROBLEMS;
		if (selectedTopicFilter !== 'all') {
			list = list.filter((p) => p.topicCategory === selectedTopicFilter);
		}
		if (selectedDifficultyFilter !== 'all') {
			list = list.filter((p) => p.difficulty.toLowerCase() === selectedDifficultyFilter.toLowerCase());
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(p) =>
					p.title.toLowerCase().includes(q) ||
					p.topic.toLowerCase().includes(q) ||
					p.tags.some((t) => t.toLowerCase().includes(q))
			);
		}
		return list;
	});

	// Solved problem IDs
	const solvedProblemIds = $derived.by(() => {
		const set = new Set<string>();
		for (const sub of allSubmissions) {
			if (sub.status === 'Accepted') {
				set.add(sub.problemId);
			}
		}
		return set;
	});

	// Submissions for currently active problem
	const currentProblemSubmissions = $derived(
		allSubmissions.filter((s) => s.problemId === currentProblem.id)
	);

	// Load code when problem or language changes
	$effect(() => {
		const key = `${currentProblem.id}_${selectedLanguage}`;
		if (codeCache[key]) {
			currentCode = codeCache[key];
		} else {
			// Check localStorage
			if (typeof window !== 'undefined') {
				const saved = localStorage.getItem(`placetrack_code_${key}`);
				if (saved) {
					currentCode = saved;
					codeCache[key] = saved;
					return;
				}
			}
			const starter = currentProblem.starterCode[selectedLanguage] || currentProblem.starterCode.python;
			currentCode = starter;
			codeCache[key] = starter;
		}
	});

	function handleCodeUpdate(newCode: string) {
		currentCode = newCode;
		const key = `${currentProblem.id}_${selectedLanguage}`;
		codeCache[key] = newCode;
		if (typeof window !== 'undefined') {
			localStorage.setItem(`placetrack_code_${key}`, newCode);
		}
	}

	function handleResetCode() {
		if (confirm('Reset editor to initial starter template? Your current edits will be replaced.')) {
			const starter = currentProblem.starterCode[selectedLanguage] || currentProblem.starterCode.python;
			handleCodeUpdate(starter);
			notificationMessage = { type: 'info', text: 'Editor reset to starter template' };
			setTimeout(() => (notificationMessage = null), 3000);
		}
	}

	function selectProblem(problem: CodingProblem) {
		selectedProblemId = problem.id;
		isProblemDrawerOpen = false;
		executionResult = null;
		submissionResult = null;
		customStdin = problem.sampleInput;
		activeConsoleTab = 'testcases';

		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.set('problem', problem.id);
			goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	async function handleRunCode() {
		isExecuting = true;
		executionResult = null;
		submissionResult = null;
		notificationMessage = null;

		try {
			const stdinToUse = activeConsoleTab === 'custom_input' && customStdin.trim()
				? customStdin
				: currentProblem.sampleInput;

			const res = await fetch('/api/code/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					language: selectedLanguage,
					code: currentCode,
					stdin: stdinToUse,
					timeLimitMs: currentProblem.timeLimitMs
				})
			});

			const data = await res.json();
			if (res.ok && data.result) {
				executionResult = data.result;
				if (data.result.isSetupError) {
					activeConsoleTab = 'testcases';
					submissionResult = {
						success: false,
						status: 'Internal Error',
						passedTests: 0,
						totalTests: currentProblem.testCases.length,
						executionTimeMs: 0,
						memoryKb: 0,
						testCaseResults: [],
						error: data.result.error,
						isSetupError: true
					};
				} else if (data.result.success) {
					activeConsoleTab = 'output';
					notificationMessage = { type: 'success', text: `Run completed in ${data.result.executionTimeMs} ms` };
				} else {
					activeConsoleTab = 'output';
					notificationMessage = { type: 'error', text: `${data.result.status}: Check error logs` };
				}
			} else {
				notificationMessage = { type: 'error', text: data.message || 'Execution failed' };
			}
		} catch (err: any) {
			console.error('Run code error:', err);
			notificationMessage = { type: 'error', text: err.message || 'Failed to connect to execution server' };
		} finally {
			isExecuting = false;
			if (notificationMessage) {
				setTimeout(() => (notificationMessage = null), 4000);
			}
		}
	}

	async function handleSubmitSolution() {
		isExecuting = true;
		executionResult = null;
		submissionResult = null;
		activeConsoleTab = 'testcases';
		notificationMessage = null;

		try {
			const res = await fetch('/api/code/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					problemId: currentProblem.id,
					language: selectedLanguage,
					code: currentCode
				})
			});

			const data = await res.json();
			if (res.ok && data.evaluation) {
				submissionResult = data.evaluation;
				const evaluation = data.evaluation;

				if (evaluation.isSetupError) {
					notificationMessage = { type: 'error', text: 'Execution sandbox is not configured' };
				} else if (evaluation.success) {
					notificationMessage = {
						type: 'success',
						text: `🎉 Accepted! All ${evaluation.totalTests} test cases passed!`
					};
				} else {
					notificationMessage = {
						type: 'error',
						text: `${evaluation.status} (${evaluation.passedTests}/${evaluation.totalTests} passed)`
					};
				}

				// Refresh submissions list
				fetch(`/api/code/submissions?problemId=${currentProblem.id}`)
					.then((r) => r.json())
					.then((json) => {
						if (json.submissions) {
							allSubmissions = [
								...json.submissions,
								...allSubmissions.filter((s) => s.problemId !== currentProblem.id)
							];
						}
					})
					.catch(() => {});
			} else {
				notificationMessage = { type: 'error', text: data.message || 'Submission evaluation failed' };
			}
		} catch (err: any) {
			console.error('Submit solution error:', err);
			notificationMessage = { type: 'error', text: err.message || 'Network error submitting solution' };
		} finally {
			isExecuting = false;
			if (notificationMessage) {
				setTimeout(() => (notificationMessage = null), 4500);
			}
		}
	}

	function handleLoadCode(codeText: string, lang: string) {
		if (['python', 'java', 'c', 'cpp'].includes(lang)) {
			selectedLanguage = lang as CodingLanguage;
		}
		handleCodeUpdate(codeText);
		notificationMessage = { type: 'info', text: 'Loaded previous submission into editor' };
		setTimeout(() => (notificationMessage = null), 3000);
	}
</script>

<svelte:head>
	<title>Coding Practice & Algorithmic Workspace | Placement Tracker</title>
</svelte:head>

<div class="coding-workspace-page">
	<!-- Top Notification Banner -->
	{#if notificationMessage}
		<div class="floating-banner banner-{notificationMessage.type}" role="status">
			{#if notificationMessage.type === 'success'}
				<CheckCircle2 size={16} />
			{:else}
				<AlertCircle size={16} />
			{/if}
			<span>{notificationMessage.text}</span>
		</div>
	{/if}

	<!-- Header with Action Controls -->
	<PageHeader
		title="Coding Practice Workspace"
		subtitle="Solve placement coding challenges in Python, Java, and C with sandboxed execution"
		breadcrumb={[
			{ label: 'Student', href: '/student/profile' },
			{ label: 'Coding Practice' }
		]}
	>
		{#snippet actions()}
			<div class="header-action-group">
				<Button
					variant="secondary"
					size="sm"
					onclick={() => (isProblemDrawerOpen = !isProblemDrawerOpen)}
				>
					{#snippet icon()}
						<List size={14} />
					{/snippet}
					{isProblemDrawerOpen ? 'Close Directory' : 'Problem Directory'}
				</Button>

				<Button
					variant="secondary"
					size="sm"
					onclick={() => (isQuizModalOpen = true)}
				>
					{#snippet icon()}
						<Brain size={14} class="text-primary" />
					{/snippet}
					AI Coding Quiz
				</Button>

				<Button
					variant={activeLeftTab === 'ai' ? 'primary' : 'secondary'}
					size="sm"
					onclick={() => (activeLeftTab = activeLeftTab === 'ai' ? 'question' : 'ai')}
				>
					{#snippet icon()}
						<Bot size={14} />
					{/snippet}
					{activeLeftTab === 'ai' ? 'Show Question' : '✨ AI Assistant'}
				</Button>

				<Button
					variant="secondary"
					size="sm"
					onclick={handleRunCode}
					disabled={isExecuting}
				>
					{#snippet icon()}
						<Play size={14} />
					{/snippet}
					Run Code
				</Button>

				<Button
					variant="primary"
					size="sm"
					onclick={handleSubmitSolution}
					disabled={isExecuting}
				>
					{#snippet icon()}
						<Send size={14} />
					{/snippet}
					Submit Solution
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<!-- Main Workspace Grid: Split-Pane Architecture -->
	<div class="ide-workspace-grid {isProblemDrawerOpen ? 'drawer-expanded' : ''}">
		<!-- LEFT / OVERLAY: Problem Directory Accordion Drawer -->
		{#if isProblemDrawerOpen}
			<aside class="problem-directory-sidebar" aria-label="Problems list">
				<div class="dir-header">
					<div class="dir-title-box">
						<BookOpen size={16} class="text-primary" />
						<span class="dir-title">Coding Problems</span>
						<Badge variant="info" size="sm">{filteredProblems.length}</Badge>
					</div>

					<!-- Search input -->
					<div class="dir-search-wrap">
						<Search size={14} class="dir-search-icon" />
						<input
							type="text"
							class="dir-search-input"
							placeholder="Search problem title or tag..."
							bind:value={searchQuery}
						/>
					</div>

					<!-- Filter dropdowns -->
					<div class="dir-filters-row">
						<select class="dir-filter-select" bind:value={selectedTopicFilter}>
							{#each CODING_TOPICS as topic}
								<option value={topic.id}>{topic.icon} {topic.label}</option>
							{/each}
						</select>

						<select class="dir-filter-select" bind:value={selectedDifficultyFilter}>
							<option value="all">All Difficulties</option>
							<option value="easy">Easy</option>
							<option value="medium">Medium</option>
							<option value="hard">Hard</option>
						</select>
					</div>
				</div>

				<!-- Problem List -->
				<div class="dir-problem-list">
					{#each filteredProblems as problem (problem.id)}
						{@const isSelected = selectedProblemId === problem.id}
						{@const isSolved = solvedProblemIds.has(problem.id)}
						<button
							type="button"
							class="dir-problem-item {isSelected ? 'is-selected' : ''}"
							onclick={() => selectProblem(problem)}
						>
							<div class="item-left">
								{#if isSolved}
									<CheckCircle2 size={16} class="text-success flex-shrink-0" />
								{:else}
									<div class="item-num-dot"></div>
								{/if}
								<div class="item-text">
									<span class="item-title">{problem.title}</span>
									<span class="item-topic">{problem.topic}</span>
								</div>
							</div>

							<div class="item-right">
								<Badge
									variant={problem.difficulty === 'Easy' ? 'success' : problem.difficulty === 'Medium' ? 'warning' : 'danger'}
									size="sm"
								>
									{problem.difficulty}
								</Badge>
							</div>
						</button>
					{/each}
				</div>
			</aside>
		{/if}

		<!-- MAIN PANE: Split Problem Description + Code Editor & Console -->
		<div class="workspace-main-split">
			<!-- Left Split: Problem Statement & AI Assistant Tabs -->
			<div class="statement-pane">
				<!-- Header Toggle Tabs: [ Question ] [ AI Assistant ] -->
				<div class="pane-tabs-bar" role="tablist" aria-label="Question and AI Assistant tabs">
					<button
						type="button"
						role="tab"
						id="tab-question"
						class="pane-tab-btn {activeLeftTab === 'question' ? 'is-active' : ''}"
						aria-selected={activeLeftTab === 'question'}
						aria-controls="panel-question"
						tabindex={activeLeftTab === 'question' ? 0 : -1}
						onclick={() => (activeLeftTab = 'question')}
					>
						<BookOpen size={14} class="tab-icon" />
						<span>Question</span>
					</button>

					<button
						type="button"
						role="tab"
						id="tab-ai"
						class="pane-tab-btn {activeLeftTab === 'ai' ? 'is-active' : ''}"
						aria-selected={activeLeftTab === 'ai'}
						aria-controls="panel-ai"
						tabindex={activeLeftTab === 'ai' ? 0 : -1}
						onclick={() => (activeLeftTab = 'ai')}
					>
						<Bot size={14} class="tab-icon" />
						<span>AI Assistant</span>
						<span class="ai-tab-glow"></span>
					</button>
				</div>

				<!-- Tab 1: Question Content -->
				<div
					id="panel-question"
					role="tabpanel"
					aria-labelledby="tab-question"
					class="tab-pane-view {activeLeftTab === 'question' ? 'is-active' : 'is-hidden'}"
				>
					<ProblemStatement problem={currentProblem} />
				</div>

				<!-- Tab 2: AI Assistant Content -->
				<div
					id="panel-ai"
					role="tabpanel"
					aria-labelledby="tab-ai"
					class="tab-pane-view ai-pane-view {activeLeftTab === 'ai' ? 'is-active' : 'is-hidden'}"
				>
					<AICodingAssistantDrawer
						isOpen={true}
						embedded={true}
						problem={currentProblem}
						language={selectedLanguage}
						code={currentCode}
						{executionResult}
						onClose={() => (activeLeftTab = 'question')}
						onApplyCode={(snippet) => handleCodeUpdate(snippet)}
					/>
				</div>
			</div>

			<!-- Right Split: Code Editor & Console Drawer -->
			<div class="editor-console-pane">
				<!-- Editor Controls Bar -->
				<div class="editor-control-bar">
					<div class="lang-selector-wrap">
						<label for="lang-select" class="lang-label">Language:</label>
						<select
							id="lang-select"
							class="lang-select"
							bind:value={selectedLanguage}
						>
							<option value="python">Python 3 (3.10)</option>
							<option value="java">Java 17 (OpenJDK)</option>
							<option value="c">C11 (GCC)</option>
							<option value="cpp">C++20 (G++)</option>
						</select>
					</div>

					<div class="quick-actions">
						<button
							type="button"
							class="btn-icon-action {activeLeftTab === 'ai' ? 'is-ai-active' : ''}"
							onclick={() => (activeLeftTab = activeLeftTab === 'ai' ? 'question' : 'ai')}
							title="Toggle Question / AI Assistant tab"
						>
							<Sparkles size={13} class="text-warning" />
							<span>{activeLeftTab === 'ai' ? 'View Question' : 'AI Assistant'}</span>
						</button>
						<button
							type="button"
							class="btn-icon-action"
							onclick={handleResetCode}
							title="Reset code"
						>
							<RotateCcw size={13} />
							<span>Reset</span>
						</button>
						<button
							type="button"
							class="btn-icon-action"
							onclick={handleRunCode}
							disabled={isExecuting}
							title="Run code (Ctrl+Enter)"
						>
							<Play size={13} class="text-primary" />
							<span>Run</span>
						</button>
						<button
							type="button"
							class="btn-icon-action is-submit"
							onclick={handleSubmitSolution}
							disabled={isExecuting}
							title="Submit solution (Ctrl+Shift+Enter)"
						>
							<Send size={13} />
							<span>Submit</span>
						</button>
					</div>
				</div>

				<!-- Code Editor Box -->
				<div class="editor-box-wrap">
					<CodeEditor
						bind:code={currentCode}
						language={selectedLanguage}
						onCodeChange={handleCodeUpdate}
						onReset={handleResetCode}
						onRun={handleRunCode}
						onSubmit={handleSubmitSolution}
					/>
				</div>

				<!-- Bottom Console & Results Drawer -->
				<div class="console-box-wrap">
					<ConsoleDrawer
						bind:activeTab={activeConsoleTab}
						{isExecuting}
						{executionResult}
						{submissionResult}
						submissionsList={currentProblemSubmissions}
						bind:customInput={customStdin}
						onTabChange={(t) => (activeConsoleTab = t)}
						onCustomInputChange={(val) => (customStdin = val)}
						onRunCustomInput={handleRunCode}
						onLoadSubmissionCode={handleLoadCode}
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- AI Generated Coding & Concept Quiz Modal -->
	<AICodingQuizModal
		bind:isOpen={isQuizModalOpen}
		initialLanguage={selectedLanguage}
		initialTopic={currentProblem.topic}
		onClose={() => (isQuizModalOpen = false)}
	/>
</div>

<style>
	.coding-workspace-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		width: 100%;
		max-width: 1440px;
		margin: 0 auto;
		min-height: calc(100vh - 80px);
	}

	.floating-banner {
		position: fixed;
		top: 70px;
		right: 24px;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 10px 18px;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
		box-shadow: var(--shadow-lg);
		z-index: 100;
		animation: slideDown 0.2s ease-out;
	}

	@keyframes slideDown {
		from { opacity: 0; transform: translateY(-8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.banner-success {
		background: #064e3b;
		color: #34d399;
		border: 1px solid #059669;
	}

	.banner-error {
		background: #7f1d1d;
		color: #fca5a5;
		border: 1px solid #dc2626;
	}

	.banner-info {
		background: #1e293b;
		color: #38bdf8;
		border: 1px solid #0284c7;
	}

	.header-action-group {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	/* Main IDE Grid */
	.ide-workspace-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		flex: 1;
		min-height: 720px;
	}

	.ide-workspace-grid.drawer-expanded {
		grid-template-columns: 320px 1fr;
	}

	@media (max-width: 1024px) {
		.ide-workspace-grid.drawer-expanded {
			grid-template-columns: 1fr;
		}
	}

	/* Problem Directory Sidebar */
	.problem-directory-sidebar {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		height: 780px;
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}

	.dir-header {
		padding: var(--space-3);
		border-bottom: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		background: var(--bg);
	}

	.dir-title-box {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.dir-title {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--text);
	}

	.dir-search-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	:global(.dir-search-icon) {
		position: absolute;
		left: 8px;
		color: var(--text-muted);
	}

	.dir-search-input {
		width: 100%;
		padding: 6px 8px 6px 28px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		background: var(--surface);
		color: var(--text);
		outline: none;
	}

	.dir-filters-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.dir-filter-select {
		padding: 4px 6px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: var(--text-2xs);
		background: var(--surface);
		color: var(--text);
		outline: none;
	}

	.dir-problem-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		padding: var(--space-1) 0;
	}

	.dir-problem-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px var(--space-3);
		background: transparent;
		border: none;
		border-left: 3px solid transparent;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s ease;
		border-bottom: 1px solid var(--border-subtle, #f1f5f9);
	}

	.dir-problem-item:hover {
		background: var(--bg);
	}

	.dir-problem-item.is-selected {
		background: var(--primary-50);
		border-left-color: var(--primary);
	}

	.item-left {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		flex: 1;
	}

	.item-num-dot {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		background: var(--slate-300);
		flex-shrink: 0;
	}

	.item-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.item-title {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-topic {
		font-size: var(--text-2xs);
		color: var(--text-muted);
	}

	/* Main Split Area */
	.workspace-main-split {
		display: grid;
		grid-template-columns: 460px 1fr;
		gap: var(--space-4);
		min-height: 780px;
	}

	@media (max-width: 1440px) {
		.workspace-main-split {
			grid-template-columns: 420px 1fr;
		}
	}

	@media (max-width: 1100px) {
		.workspace-main-split {
			grid-template-columns: 1fr;
		}
	}

	.statement-pane {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		overflow: hidden;
		height: 780px;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-sm);
	}

	/* Toggle Tabs Header */
	.pane-tabs-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		padding: 8px 12px;
		flex-shrink: 0;
	}

	.pane-tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 16px;
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-muted);
		background: transparent;
		border: 1px solid transparent;
		cursor: pointer;
		position: relative;
		transition: all 0.15s ease;
		user-select: none;
	}

	.pane-tab-btn:hover {
		color: var(--text);
		background: var(--surface);
		border-color: var(--border);
	}

	.pane-tab-btn.is-active {
		background: var(--primary-50);
		color: var(--primary);
		border-color: var(--primary-200);
		font-weight: 700;
		box-shadow: 0 1px 2px rgba(15, 76, 129, 0.08);
	}

	:global(.tab-icon) {
		flex-shrink: 0;
	}

	.pane-tab-btn.is-active :global(.tab-icon) {
		color: var(--primary);
	}

	.ai-tab-glow {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		background: #0ea5e9;
		box-shadow: 0 0 6px #0ea5e9;
		display: inline-block;
	}

	/* Tab Content Panes */
	.tab-pane-view {
		flex: 1;
		min-height: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.tab-pane-view.is-hidden {
		display: none;
	}

	.ai-pane-view {
		background: #0b1329;
	}

	.editor-console-pane {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		height: 780px;
	}

	.editor-control-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--surface);
		border: 1px solid var(--border);
		padding: 6px var(--space-3);
		border-radius: var(--radius-md);
	}

	.lang-selector-wrap {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.lang-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-muted);
	}

	.lang-select {
		padding: 4px 8px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text);
		background: var(--bg);
		outline: none;
	}

	.quick-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.btn-icon-action {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-icon-action:hover {
		background: var(--bg);
		border-color: var(--border-strong);
	}

	.btn-icon-action.is-ai-active {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4338ca;
	}

	.btn-icon-action.is-ai-active:hover {
		background: #4338ca;
	}

	.btn-icon-action.is-submit {
		background: var(--primary);
		color: #ffffff;
		border-color: var(--primary);
	}

	.btn-icon-action.is-submit:hover {
		background: var(--primary-600);
	}

	.editor-box-wrap {
		flex: 1.2;
		min-height: 380px;
		display: flex;
		flex-direction: column;
	}

	.console-box-wrap {
		flex: 0.9;
		min-height: 280px;
		display: flex;
		flex-direction: column;
	}

	.text-success { color: var(--success); }
</style>
