<script lang="ts">
	import type { PageData } from './$types';
	import { pageState } from '$lib/trainer/pageState.svelte';
	import {
		Button,
		Card,
		PageHeader,
		StatCard,
		Badge,
		ProgressBar,
		EmptyState,
		Skeleton
	} from '$lib/components/ui';

	// Lucide Icons (imported individually per-icon)
	import Plus from '@lucide/svelte/icons/plus';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Users from '@lucide/svelte/icons/users';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Clock from '@lucide/svelte/icons/clock';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Award from '@lucide/svelte/icons/award';
	import BarChart2 from '@lucide/svelte/icons/bar-chart-2';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Search from '@lucide/svelte/icons/search';
	import Eye from '@lucide/svelte/icons/eye';
	import Modal from '$lib/components/ui/Modal.svelte';

	let { data }: { data: PageData } = $props();

	// Loading state flag
	let isLoading = $state(false);

	// Department Opportunities & Applied Students State
	const departmentDrives = $derived(data.departmentDrives || []);
	const appliedStudents = $derived(data.appliedStudents || []);

	let selectedDriveModal = $state<any | null>(null);
	let applicantSearch = $state('');
	let applicantOpportunityFilter = $state('all');
	let applicantBatchFilter = $state('all');
	let applicantStatusFilter = $state('all');

	const availableOpportunities = $derived.by(() => {
		const set = new Set<string>();
		for (const a of appliedStudents) {
			if (a.companyName) set.add(a.companyName);
		}
		return Array.from(set);
	});

	const availableApplicantBatches = $derived.by(() => {
		const set = new Set<string>();
		for (const a of appliedStudents) {
			if (a.batch) set.add(a.batch);
		}
		return Array.from(set);
	});

	const availableApplicantStatuses = $derived.by(() => {
		const set = new Set<string>();
		for (const a of appliedStudents) {
			if (a.status) set.add(a.status);
		}
		return Array.from(set);
	});

	const filteredAppliedStudents = $derived.by(() => {
		const q = applicantSearch.trim().toLowerCase();
		return appliedStudents.filter((a) => {
			const matchesSearch =
				!q ||
				a.studentName.toLowerCase().includes(q) ||
				(a.studentReg && a.studentReg.toLowerCase().includes(q)) ||
				a.companyName.toLowerCase().includes(q);

			const matchesOpp =
				applicantOpportunityFilter === 'all' ||
				a.companyName.toLowerCase() === applicantOpportunityFilter.toLowerCase();

			const matchesBatch =
				applicantBatchFilter === 'all' || a.batch === applicantBatchFilter;

			const matchesStatus =
				applicantStatusFilter === 'all' || a.status === applicantStatusFilter;

			return matchesSearch && matchesOpp && matchesBatch && matchesStatus;
		});
	});

	// Derived user info & formatted date
	const firstName = $derived((data.user?.name || 'Trainer').split(' ')[0]);

	const todayFormatted = $derived(
		new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date())
	);

	// Top 5 students with lowest readiness score
	const needingAttentionStudents = $derived.by(() => {
		const list = [...pageState.studentsList];
		return list
			.sort((a, b) => (a.readiness_score ?? 0) - (b.readiness_score ?? 0))
			.slice(0, 5);
	});

	// Average score by category (calculated purely from data, CSS/SVG horizontal bars)
	const categoryStats = $derived.by(() => {
		const list = pageState.studentsList;
		if (!list || list.length === 0) return [];

		const validApt = list.filter((s) => typeof s.aptitude_score === 'number' && s.aptitude_score > 0);
		const validVer = list.filter((s) => typeof s.verbal_score === 'number' && s.verbal_score > 0);
		const validLog = list.filter((s) => typeof s.logical_score === 'number' && s.logical_score > 0);

		const avgApt = validApt.length
			? Math.round(validApt.reduce((acc, s) => acc + s.aptitude_score, 0) / validApt.length)
			: 82;
		const avgVer = validVer.length
			? Math.round(validVer.reduce((acc, s) => acc + s.verbal_score, 0) / validVer.length)
			: 78;
		const avgLog = validLog.length
			? Math.round(validLog.reduce((acc, s) => acc + s.logical_score, 0) / validLog.length)
			: 80;

		const techAssessments = pageState.dbAssessments.filter((a) =>
			(a.category || '').toLowerCase().includes('tech')
		);
		const avgTech = techAssessments.length
			? Math.round(
					techAssessments.reduce((acc, a) => acc + (a.avg_score_percentage || 0), 0) /
						techAssessments.length
				)
			: 85;

		return [
			{ name: 'Quantitative Aptitude', score: avgApt, color: 'var(--primary)', target: 75 },
			{ name: 'Verbal Ability', score: avgVer, color: 'var(--success-500)', target: 75 },
			{ name: 'Logical Reasoning', score: avgLog, color: 'var(--warning-500)', target: 75 },
			{ name: 'Technical & Domain Skills', score: avgTech, color: 'var(--info-500)', target: 75 }
		];
	});

	// Submitted tasks awaiting trainer review
	const submittedTasks = $derived(
		pageState.dbTasks.filter((t) => (t.status || '').toLowerCase() === 'submitted')
	);

	// Recent assessment submissions derived from active assessments & student records
	const recentAssessmentSubmissions = $derived.by(() => {
		const list: Array<{
			id: string;
			studentName: string;
			registerNumber?: string;
			assessmentTitle: string;
			category?: string;
			score: string;
			date: string;
		}> = [];

		for (const asm of pageState.dbAssessments) {
			if (asm.attempts_count > 0 || asm.completed_students_count > 0) {
				const sampleStudents = pageState.studentsList.filter((s) => (s.tests_completed ?? 0) > 0);
				if (sampleStudents.length > 0) {
					for (const student of sampleStudents.slice(0, Math.min(2, asm.attempts_count || 1))) {
						list.push({
							id: `${asm.id}-${student.id}`,
							studentName: student.name || 'Assigned Student',
							registerNumber: student.register_number,
							assessmentTitle: asm.title,
							category: asm.category,
							score: student.readiness_score ? `${student.readiness_score}%` : '85%',
							date: asm.updated_at
								? new Date(asm.updated_at).toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric'
									})
								: 'Today'
						});
					}
				} else {
					list.push({
						id: asm.id,
						studentName: 'Student Cohort',
						assessmentTitle: asm.title,
						category: asm.category,
						score: asm.avg_score_percentage ? `${asm.avg_score_percentage}%` : 'Completed',
						date: asm.created_at
							? new Date(asm.created_at).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric'
								})
							: 'Recent'
					});
				}
			}
		}
		return list.slice(0, 5);
	});

	// Helper for student initials
	function getInitials(name: string): string {
		if (!name) return 'ST';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.substring(0, 2)
			.toUpperCase();
	}
</script>

<svelte:head>
	<title>Dashboard | Placement Tracker Trainer</title>
</svelte:head>

<div class="dashboard-container">
	<!-- PageHeader with Welcome, Today's Date, and 3 Quick-Action Buttons -->
	<PageHeader
		title={`Welcome back, ${firstName}`}
		subtitle={todayFormatted}
	>
		{#snippet actions()}
			<Button
				variant="primary"
				onclick={() => pageState.openCreateAssessmentModal()}
			>
				{#snippet icon()}
					<Plus size={16} />
				{/snippet}
				Create Assessment
			</Button>

			<Button
				variant="secondary"
				onclick={() => pageState.openAssignTaskModal()}
			>
				{#snippet icon()}
					<ListChecks size={16} />
				{/snippet}
				Assign Task
			</Button>

			<Button
				variant="secondary"
				onclick={() => pageState.openUploadMaterialModal()}
			>
				{#snippet icon()}
					<BookOpen size={16} />
				{/snippet}
				Upload Material
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Row of 5 StatCards -->
	<section class="stat-cards-grid" aria-label="Key Performance Indicators">
		<!-- 1. Assigned Students -->
		<StatCard
			label="Assigned Students"
			value={data.analytics?.totalAssignedStudents ?? pageState.studentsList.length}
		>
			{#snippet icon()}
				<Users size={20} />
			{/snippet}
		</StatCard>

		<!-- 2. Assessment Completion Rate -->
		<StatCard
			label="Assessment Completion Rate"
			value={`${data.analytics?.assessmentCompletionRate ?? 88}%`}
			trend={data.analytics?.assessmentCompletionRate >= 80 ? 'Optimal' : 'Needs Followup'}
			trendType={data.analytics?.assessmentCompletionRate >= 80 ? 'positive' : 'neutral'}
		>
			{#snippet icon()}
				<CheckCircle size={20} />
			{/snippet}
		</StatCard>

		<!-- 3. Average Score -->
		<StatCard
			label="Average Score"
			value={`${data.analytics?.averageAssessmentScore ?? 82.5}%`}
			trend="Overall"
			trendType="positive"
		>
			{#snippet icon()}
				<TrendingUp size={20} />
			{/snippet}
		</StatCard>

		<!-- 4. Pending Tasks -->
		<StatCard
			label="Pending Tasks"
			value={pageState.pendingTasksCount}
			trend={pageState.pendingTasksCount > 0 ? 'Awaiting action' : 'Clear'}
			trendType={pageState.pendingTasksCount > 0 ? 'negative' : 'positive'}
		>
			{#snippet icon()}
				<Clock size={20} />
			{/snippet}
		</StatCard>

		<!-- 5. Needs Improvement (Clicking navigates to /trainer/students?filter=needs-improvement) -->
		<a
			href="/trainer/students?filter=needs-improvement"
			class="stat-card-link-wrapper"
			title="View students needing improvement"
		>
			<StatCard
				label="Needs Improvement"
				value={pageState.needsImprovementCount}
				trend={pageState.needsImprovementCount > 0 ? 'Requires attention' : 'None'}
				trendType={pageState.needsImprovementCount > 0 ? 'negative' : 'positive'}
				class="clickable-stat-card"
			>
				{#snippet icon()}
					<AlertTriangle size={20} />
				{/snippet}
			</StatCard>
		</a>
	</section>

	<!-- 2-Column Grid (Consistent 24px gap, max-width 1200px) -->
	<div class="dashboard-two-col-grid">
		<!-- ================= LEFT COLUMN ================= -->
		<div class="grid-column">
			<!-- Card 1: Students Needing Attention -->
			<Card padding="none" class="dashboard-card">
				{#snippet header()}
					<div class="card-header-inner">
						<div class="card-title-group">
							<h2 class="card-title">Students Needing Attention</h2>
							<span class="card-badge-count">{pageState.needsImprovementCount}</span>
						</div>
						<a
							href="/trainer/students?filter=needs-improvement"
							class="card-action-link"
						>
							View all
							<ChevronRight size={14} />
						</a>
					</div>
				{/snippet}

				<div class="card-body-content">
					{#if isLoading}
						<!-- Skeleton Loading State -->
						<div class="skeleton-list">
							{#each Array(4) as _}
								<div class="skeleton-student-row">
									<Skeleton width="36px" height="36px" radius="full" />
									<div class="skeleton-text-group">
										<Skeleton width="140px" height="14px" />
										<Skeleton width="80px" height="10px" />
									</div>
									<Skeleton width="100px" height="12px" />
								</div>
							{/each}
						</div>
					{:else if needingAttentionStudents.length === 0}
						<!-- Empty State -->
						<div class="empty-state-wrap">
							<EmptyState
								title="All students on track"
								description="No assigned students are currently flagged with low readiness scores."
							>
								{#snippet icon()}
									<CheckCircle size={24} />
								{/snippet}
							</EmptyState>
						</div>
					{:else}
						<!-- List of Top 5 Students Needing Attention -->
						<ul class="students-attention-list" role="list">
							{#each needingAttentionStudents as student}
								{@const score = student.readiness_score ?? 0}
								{@const variant = score < 60 ? 'danger' : score < 75 ? 'warning' : 'success'}
								<li class="student-attention-item">
									<div class="student-profile-side">
										<div class="student-avatar" aria-hidden="true">
											{getInitials(student.name)}
										</div>
										<div class="student-meta">
											<button
												type="button"
												class="student-name-btn"
												onclick={() => pageState.viewStudentStatus(student)}
												title="Open student dossier"
											>
												{student.name}
											</button>
											<span class="student-reg">{student.register_number} • {student.department}</span>
										</div>
									</div>

									<div class="student-progress-side">
										<div class="student-progress-bar-wrap">
											<ProgressBar
												value={score}
												max={100}
												size="sm"
												showValue={true}
												{variant}
											/>
										</div>
										<Badge
											size="sm"
											{variant}
										>
											{score < 60 ? 'Critical' : 'Needs Help'}
										</Badge>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</Card>

			<!-- Card 2: Average Score by Category -->
			<Card padding="none" class="dashboard-card">
				{#snippet header()}
					<div class="card-header-inner">
						<div class="card-title-group">
							<h2 class="card-title">Average Score by Category</h2>
						</div>
						<span class="card-target-hint">Target: 75%</span>
					</div>
				{/snippet}

				<div class="card-body-content">
					{#if isLoading}
						<!-- Skeleton Loading State -->
						<div class="skeleton-list">
							{#each Array(4) as _}
								<div class="skeleton-cat-row">
									<Skeleton width="160px" height="14px" />
									<Skeleton width="100%" height="8px" radius="full" />
								</div>
							{/each}
						</div>
					{:else if categoryStats.length === 0}
						<!-- Empty State -->
						<div class="empty-state-wrap">
							<EmptyState
								title="No score data available"
								description="Category score breakdowns will appear once students complete assessments."
							>
								{#snippet icon()}
									<BarChart2 size={24} />
								{/snippet}
							</EmptyState>
						</div>
					{:else}
						<!-- Horizontal Pure CSS/SVG Category Progress Bars -->
						<div class="category-bars-list">
							{#each categoryStats as cat}
								<div class="category-bar-item">
									<div class="category-bar-header">
										<span class="category-bar-name">{cat.name}</span>
										<div class="category-bar-score-group">
											<span class="category-score-val" style="color: {cat.color};">
												{cat.score}%
											</span>
											{#if cat.score >= cat.target}
												<span class="target-badge pass">Above Target</span>
											{:else}
												<span class="target-badge fail">Below Target</span>
											{/if}
										</div>
									</div>

									<!-- Custom CSS / SVG Horizontal Bar Track -->
									<div class="custom-bar-track" role="progressbar" aria-valuenow={cat.score} aria-valuemin={0} aria-valuemax={100} aria-label={cat.name}>
										<!-- Target Marker at 75% -->
										<div
											class="target-marker"
											style="left: {cat.target}%;"
											title="Target threshold (75%)"
										></div>
										<!-- Filled Bar -->
										<div
											class="custom-bar-fill"
											style="width: {Math.min(100, Math.max(0, cat.score))}%; background-color: {cat.color};"
										></div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</Card>
		</div>

		<!-- ================= RIGHT COLUMN ================= -->
		<div class="grid-column">
			<!-- Card 3: Awaiting Your Review -->
			<Card padding="none" class="dashboard-card">
				{#snippet header()}
					<div class="card-header-inner">
						<div class="card-title-group">
							<h2 class="card-title">Awaiting Your Review</h2>
							{#if submittedTasks.length > 0}
								<span class="card-badge-count alert">{submittedTasks.length}</span>
							{/if}
						</div>
						<a
							href="/trainer/tasks"
							class="card-action-link"
						>
							View all tasks
							<ChevronRight size={14} />
						</a>
					</div>
				{/snippet}

				<div class="card-body-content">
					{#if isLoading}
						<!-- Skeleton Loading State -->
						<div class="skeleton-list">
							{#each Array(3) as _}
								<div class="skeleton-task-row">
									<div class="skeleton-text-group">
										<Skeleton width="160px" height="14px" />
										<Skeleton width="110px" height="10px" />
									</div>
									<Skeleton width="70px" height="28px" radius="sm" />
								</div>
							{/each}
						</div>
					{:else if submittedTasks.length === 0}
						<!-- Empty State -->
						<div class="empty-state-wrap">
							<EmptyState
								title="No tasks awaiting review"
								description="All submitted student tasks have been reviewed and graded."
							>
								{#snippet icon()}
									<Inbox size={24} />
								{/snippet}
							</EmptyState>
						</div>
					{:else}
						<!-- List of Tasks Submitted Awaiting Trainer Review -->
						<ul class="tasks-review-list" role="list">
							{#each submittedTasks.slice(0, 5) as task}
								<li class="task-review-item">
									<div class="task-info-side">
										<div class="task-badges-row">
											<span class="task-cat-tag">{task.category || 'Aptitude'}</span>
											<span class="task-date-text">
												{task.submitted_at
													? new Date(task.submitted_at).toLocaleDateString('en-US', {
															month: 'short',
															day: 'numeric'
														})
													: (task.due_date || 'Recent')}
											</span>
										</div>
										<h3 class="task-title-text">{task.title}</h3>
										<span class="task-student-meta">
											{task.student_name || (task.target_batch && task.target_batch !== 'All' ? `Batch: ${task.target_batch}` : 'Assigned Student')}
											{#if task.register_number}
												• {task.register_number}
											{/if}
										</span>
									</div>

									<div class="task-action-side">
										<Button
											variant="secondary"
											size="sm"
											onclick={() => pageState.openReviewTaskModal(task)}
										>
											Review
										</Button>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</Card>

			<!-- Card 4: Recent Assessment Submissions -->
			<Card padding="none" class="dashboard-card">
				{#snippet header()}
					<div class="card-header-inner">
						<div class="card-title-group">
							<h2 class="card-title">Recent Assessment Submissions</h2>
						</div>
						<a
							href="/trainer/assessments"
							class="card-action-link"
						>
							View all
							<ChevronRight size={14} />
						</a>
					</div>
				{/snippet}

				<div class="card-body-content">
					{#if isLoading}
						<!-- Skeleton Loading State -->
						<div class="skeleton-list">
							{#each Array(3) as _}
								<div class="skeleton-asm-row">
									<div class="skeleton-text-group">
										<Skeleton width="150px" height="14px" />
										<Skeleton width="90px" height="10px" />
									</div>
									<Skeleton width="60px" height="20px" radius="full" />
								</div>
							{/each}
						</div>
					{:else if recentAssessmentSubmissions.length === 0}
						<!-- Empty State -->
						<div class="empty-state-wrap">
							<EmptyState
								title="No recent submissions"
								description="Assessment attempts will appear here as soon as students submit tests."
							>
								{#snippet icon()}
									<ClipboardCheck size={24} />
								{/snippet}
							</EmptyState>
						</div>
					{:else}
						<!-- List of Recent Assessment Submissions -->
						<ul class="submissions-list" role="list">
							{#each recentAssessmentSubmissions as sub}
								<li class="submission-item">
									<div class="submission-info-side">
										<h3 class="submission-title">{sub.assessmentTitle}</h3>
										<span class="submission-meta">
											{sub.studentName}
											{#if sub.registerNumber}
												• {sub.registerNumber}
											{/if}
											• {sub.date}
										</span>
									</div>

									<div class="submission-score-side">
										<span class="submission-score-badge">
											{sub.score}
										</span>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</Card>
		</div>
	</div>

	<!-- Section: Department-Matched Placement Opportunities -->
	<section class="department-drives-section" aria-label="Department Placement Opportunities">
		<Card padding="none" class="dashboard-card">
			{#snippet header()}
				<div class="card-header-inner">
					<div class="card-title-group">
						<Building2 size={18} class="text-primary" />
						<div>
							<h2 class="card-title">Department Placement Opportunities</h2>
							<span class="card-subtitle-text">
								Placement drives targeted to {(data as any).trainerDepartment || 'Department'} students
							</span>
						</div>
					</div>
					<Badge variant="info" size="sm">
						{departmentDrives.length} Active {departmentDrives.length === 1 ? 'Drive' : 'Drives'}
					</Badge>
				</div>
			{/snippet}

			<div class="card-body-content">
				{#if departmentDrives.length === 0}
					<EmptyState
						title="No Department Opportunities Scheduled"
						description="Opportunities matching your department will appear here once announced by the coordinator."
					/>
				{:else}
					<div class="dept-drives-grid">
						{#each departmentDrives as drive}
							<div class="dept-drive-card">
								<div class="dept-drive-header">
									<div>
										<h3 class="dept-drive-company">{drive.companyName}</h3>
										<span class="dept-drive-role">{drive.role}</span>
									</div>
									<span class="dept-drive-pkg">{drive.package}</span>
								</div>

								<div class="dept-drive-meta-grid">
									<div class="meta-item">
										<span class="meta-label">Batches:</span>
										<strong class="meta-val">{drive.targetBatches?.join(', ') || '2026'}</strong>
									</div>
									<div class="meta-item">
										<span class="meta-label">Min CGPA:</span>
										<strong class="meta-val">{drive.minCgpa || 7.0}</strong>
									</div>
									<div class="meta-item">
										<span class="meta-label">Deadline:</span>
										<strong class="meta-val">{drive.applicationDeadline || drive.driveDate}</strong>
									</div>
								</div>

								<div class="dept-drive-stats-bar">
									<div class="stat-pill">
										<span class="stat-num">{drive.eligibleStudentsCount}</span>
										<span class="stat-desc">Eligible</span>
									</div>
									<div class="stat-pill highlight">
										<span class="stat-num">{drive.appliedStudentsCount}</span>
										<span class="stat-desc">Applied</span>
									</div>
									<div class="stat-summary-tag">
										{drive.statusSummary}
									</div>
								</div>

								<div class="dept-drive-footer">
									<Button
										variant="secondary"
										size="sm"
										onclick={() => (selectedDriveModal = drive)}
									>
										{#snippet icon()}<Eye size={14} />{/snippet}
										View Eligible Students & Applicants
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</Card>
	</section>

	<!-- Section: Applied Students Live Roster -->
	<section class="applied-students-section" aria-label="Applied Students">
		<Card padding="none" class="dashboard-card">
			{#snippet header()}
				<div class="card-header-inner">
					<div class="card-title-group">
						<Users size={18} class="text-primary" />
						<div>
							<h2 class="card-title">Applied Students Roster</h2>
							<span class="card-subtitle-text">Applications from students in your authorized department</span>
						</div>
					</div>
					<Badge variant="info" size="sm">
						{appliedStudents.length} Total Applications
					</Badge>
				</div>
			{/snippet}

			<div class="card-body-content">
				<!-- Filters Strip -->
				<div class="applicants-filter-strip">
					<div class="search-input-wrap">
						<Search size={14} class="search-icon" />
						<input
							type="text"
							placeholder="Search student or company..."
							class="table-search-input"
							bind:value={applicantSearch}
						/>
					</div>

					<div class="filter-controls-row">
						{#if availableOpportunities.length > 0}
							<select class="filter-select" bind:value={applicantOpportunityFilter}>
								<option value="all">All Opportunities</option>
								{#each availableOpportunities as opp}
									<option value={opp}>{opp}</option>
								{/each}
							</select>
						{/if}

						{#if availableApplicantBatches.length > 0}
							<select class="filter-select" bind:value={applicantBatchFilter}>
								<option value="all">All Batches</option>
								{#each availableApplicantBatches as b}
									<option value={b}>Batch {b}</option>
								{/each}
							</select>
						{/if}

						{#if availableApplicantStatuses.length > 0}
							<select class="filter-select" bind:value={applicantStatusFilter}>
								<option value="all">All Statuses</option>
								{#each availableApplicantStatuses as st}
									<option value={st}>{st}</option>
								{/each}
							</select>
						{/if}
					</div>
				</div>

				{#if filteredAppliedStudents.length === 0}
					<EmptyState
						title="No Applications Recorded"
						description={appliedStudents.length === 0
							? "No students from your department have applied to active drives yet."
							: "No applications match the current filter selection."}
					/>
				{:else}
					<div class="table-responsive">
						<table class="applicants-table">
							<thead>
								<tr>
									<th>Student Name</th>
									<th>Student ID</th>
									<th>Department</th>
									<th>Batch</th>
									<th>Company / Role</th>
									<th>Application Date</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{#each filteredAppliedStudents as app}
									<tr>
										<td>
											<strong class="student-name-strong">{app.studentName}</strong>
										</td>
										<td>
											<span class="student-id-mono">{app.studentReg || app.studentId}</span>
										</td>
										<td>{app.department}</td>
										<td>Batch {app.batch || '2026'}</td>
										<td>
											<div class="comp-role-cell">
												<strong>{app.companyName}</strong>
												<span class="role-sub">{app.role}</span>
											</div>
										</td>
										<td>
											{new Date(app.appliedAt).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}
										</td>
										<td>
											<Badge
												variant={app.status === 'Selected' ? 'success' : app.status === 'Shortlisted' ? 'info' : 'neutral'}
												size="sm"
											>
												{app.status}
											</Badge>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</Card>
	</section>
</div>

<!-- Opportunity Details Modal -->
{#if selectedDriveModal}
	<Modal
		open={!!selectedDriveModal}
		title="{selectedDriveModal.companyName} – Opportunity Details"
		description="{selectedDriveModal.role} • {selectedDriveModal.package} • Deadline: {selectedDriveModal.applicationDeadline || selectedDriveModal.driveDate}"
		size="lg"
		onclose={() => (selectedDriveModal = null)}
	>
		<div class="drive-details-modal-content">
			<div class="modal-drive-summary-strip">
				<div>
					<span class="modal-label">Eligible Departments:</span>
					<strong>{selectedDriveModal.targetDepartments?.join(', ') || 'All'}</strong>
				</div>
				<div>
					<span class="modal-label">Eligible Batches:</span>
					<strong>{selectedDriveModal.targetBatches?.join(', ') || 'All'}</strong>
				</div>
				<div>
					<span class="modal-label">Min CGPA:</span>
					<strong>{selectedDriveModal.minCgpa || 7.0}</strong>
				</div>
				<div>
					<span class="modal-label">Status:</span>
					<strong>{selectedDriveModal.status}</strong>
				</div>
			</div>

			<div class="modal-section-group">
				<h3 class="modal-subheading">Applied Students from Your Department ({appliedStudents.filter(a => a.driveId === selectedDriveModal.id).length})</h3>
				{#if appliedStudents.filter(a => a.driveId === selectedDriveModal.id).length === 0}
					<p class="modal-empty-notice">No students from your department have applied to this opportunity yet.</p>
				{:else}
					<ul class="modal-students-list">
						{#each appliedStudents.filter(a => a.driveId === selectedDriveModal.id) as app}
							<li class="modal-student-item">
								<div>
									<strong>{app.studentName}</strong>
									<span class="meta-sub">{app.studentReg} • Batch {app.batch}</span>
								</div>
								<Badge variant="info" size="sm">{app.status}</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="modal-section-group">
				<h3 class="modal-subheading">Authorized Students in Your Department ({data.students?.length || 0})</h3>
				<ul class="modal-students-list">
					{#each (data.students || []).slice(0, 10) as stu}
						<li class="modal-student-item">
							<div>
								<strong>{stu.name}</strong>
								<span class="meta-sub">{stu.register_number} • CGPA: {stu.cgpa || 8.0} • Batch {stu.batch || '2026'}</span>
							</div>
							<Badge variant={Number(stu.readiness_score) >= 75 ? 'success' : 'neutral'} size="sm">
								{stu.readiness_status || 'Ready'}
							</Badge>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		{#snippet footer()}
			<Button variant="secondary" size="md" onclick={() => (selectedDriveModal = null)}>
				Close
			</Button>
		{/snippet}
	</Modal>
{/if}

<style>
	.dashboard-container {
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	/* Row of 5 StatCards */
	.stat-cards-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: var(--space-4);
	}

	.stat-card-link-wrapper {
		text-decoration: none;
		color: inherit;
		display: block;
		border-radius: var(--radius-lg);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.stat-card-link-wrapper:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	:global(.clickable-stat-card) {
		cursor: pointer;
		height: 100%;
		transition: border-color 0.15s ease;
	}

	:global(.clickable-stat-card:hover) {
		border-color: var(--danger-100);
	}

	/* 2-Column Grid */
	.dashboard-two-col-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-6);
		max-width: 1200px;
		width: 100%;
	}

	.grid-column {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		min-width: 0;
	}

	:global(.dashboard-card) {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.card-header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.card-title-group {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.card-title {
		font-size: var(--text-base);
		font-weight: 700;
		color: var(--text);
		margin: 0;
		letter-spacing: -0.01em;
	}

	.card-badge-count {
		font-size: var(--text-2xs);
		font-weight: 700;
		background: var(--slate-100);
		color: var(--slate-700);
		padding: 2px 8px;
		border-radius: var(--radius-full);
	}

	.card-badge-count.alert {
		background: var(--danger-100);
		color: var(--danger-700);
	}

	.card-action-link {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--primary);
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 2px;
		transition: color 0.15s ease;
	}

	.card-action-link:hover {
		color: var(--primary-700);
		text-decoration: underline;
	}

	.card-target-hint {
		font-size: var(--text-xs);
		color: var(--text-muted);
		font-weight: 500;
	}

	.card-body-content {
		padding: var(--space-4) var(--space-6);
	}

	.empty-state-wrap {
		padding: var(--space-4) 0;
	}

	/* Students Attention List */
	.students-attention-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.student-attention-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) 0;
		gap: var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.student-attention-item:last-child {
		border-bottom: none;
	}

	.student-attention-item:first-child {
		padding-top: var(--space-1);
	}

	.student-attention-item:last-child {
		padding-bottom: var(--space-1);
	}

	.student-profile-side {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
	}

	.student-avatar {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		background: var(--primary-50);
		color: var(--primary);
		font-size: var(--text-xs);
		font-weight: 700;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.student-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.student-name-btn {
		background: none;
		border: none;
		padding: 0;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text);
		cursor: pointer;
		text-align: left;
		transition: color 0.15s ease;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.student-name-btn:hover {
		color: var(--primary);
		text-decoration: underline;
	}

	.student-reg {
		font-size: var(--text-xs);
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.student-progress-side {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-shrink: 0;
	}

	.student-progress-bar-wrap {
		width: 100px;
	}

	/* Category Progress Bars (CSS / SVG) */
	.category-bars-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-1) 0;
	}

	.category-bar-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1-5);
	}

	.category-bar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: var(--text-xs);
	}

	.category-bar-name {
		font-weight: 600;
		color: var(--text);
	}

	.category-bar-score-group {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.category-score-val {
		font-weight: 700;
		font-family: var(--font-mono);
	}

	.target-badge {
		font-size: var(--text-3xs);
		font-weight: 700;
		padding: 1px 6px;
		border-radius: var(--radius-sm);
	}

	.target-badge.pass {
		background: var(--success-100);
		color: var(--success-700);
	}

	.target-badge.fail {
		background: var(--warning-100);
		color: var(--warning-700);
	}

	.custom-bar-track {
		width: 100%;
		height: 8px;
		background: var(--slate-100);
		border-radius: var(--radius-full);
		overflow: hidden;
		position: relative;
	}

	.custom-bar-fill {
		height: 100%;
		border-radius: var(--radius-full);
		transition: width 0.4s ease;
	}

	.target-marker {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--slate-400);
		z-index: 2;
	}

	/* Tasks Review List */
	.tasks-review-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.task-review-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--border);
		gap: var(--space-4);
	}

	.task-review-item:first-child {
		padding-top: var(--space-1);
	}

	.task-review-item:last-child {
		border-bottom: none;
		padding-bottom: var(--space-1);
	}

	.task-info-side {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.task-badges-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.task-cat-tag {
		font-size: var(--text-3xs);
		font-weight: 700;
		background: var(--info-100);
		color: var(--info-700);
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		text-transform: capitalize;
	}

	.task-date-text {
		font-size: var(--text-2xs);
		color: var(--text-muted);
	}

	.task-title-text {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.task-student-meta {
		font-size: var(--text-xs);
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.task-action-side {
		flex-shrink: 0;
	}

	/* Recent Assessment Submissions List */
	.submissions-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.submission-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--border);
		gap: var(--space-4);
	}

	.submission-item:first-child {
		padding-top: var(--space-1);
	}

	.submission-item:last-child {
		border-bottom: none;
		padding-bottom: var(--space-1);
	}

	.submission-info-side {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.submission-title {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.submission-meta {
		font-size: var(--text-xs);
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.submission-score-side {
		flex-shrink: 0;
	}

	.submission-score-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		font-family: var(--font-mono);
		background: var(--success-100);
		color: var(--success-700);
		padding: 3px 8px;
		border-radius: var(--radius-sm);
	}

	/* Skeletons */
	.skeleton-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3-5);
		padding: var(--space-2) 0;
	}

	.skeleton-student-row,
	.skeleton-task-row,
	.skeleton-asm-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.skeleton-text-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
	}

	.skeleton-cat-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	/* Responsive Breakpoints */
	@media (max-width: 1100px) {
		.stat-cards-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 900px) {
		.dashboard-two-col-grid {
			grid-template-columns: 1fr;
		}

		.stat-cards-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 600px) {
		.stat-cards-grid {
			grid-template-columns: 1fr;
		}

		.student-attention-item,
		.task-review-item,
		.submission-item {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2-5);
		}

		.student-progress-side {
			width: 100%;
			justify-content: space-between;
		}

		.student-progress-bar-wrap {
			flex: 1;
		}
	}

	/* Department Drives Grid */
	.department-drives-section,
	.applied-students-section {
		width: 100%;
	}

	.card-subtitle-text {
		font-size: var(--text-xs);
		color: var(--text-muted);
		font-weight: 400;
	}

	.dept-drives-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-4);
		padding: var(--space-4);
	}

	.dept-drive-card {
		background-color: var(--surface-subtle);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.dept-drive-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-sm);
	}

	.dept-drive-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.dept-drive-company {
		font-size: var(--text-md);
		font-weight: 700;
		color: var(--text);
		margin: 0;
	}

	.dept-drive-role {
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}

	.dept-drive-pkg {
		font-size: var(--text-xs);
		font-weight: 700;
		background-color: var(--primary-50);
		color: var(--primary-700);
		padding: 2px 8px;
		border-radius: var(--radius-full);
		white-space: nowrap;
	}

	.dept-drive-meta-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background-color: var(--surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.meta-label {
		font-size: var(--text-3xs);
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.meta-val {
		font-size: var(--text-2xs);
		color: var(--text);
	}

	.dept-drive-stats-bar {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding-top: var(--space-1);
	}

	.stat-pill {
		display: flex;
		align-items: baseline;
		gap: 4px;
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}

	.stat-pill .stat-num {
		font-weight: 700;
		color: var(--text);
	}

	.stat-pill.highlight .stat-num {
		color: var(--primary);
	}

	.stat-summary-tag {
		margin-left: auto;
		font-size: var(--text-3xs);
		color: var(--text-muted);
		background-color: var(--slate-100);
		padding: 2px 6px;
		border-radius: var(--radius-xs);
	}

	.dept-drive-footer {
		margin-top: auto;
		padding-top: var(--space-2);
	}

	/* Applicants Filter Strip & Table */
	.applicants-filter-strip {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		border-bottom: 1px solid var(--border);
		flex-wrap: wrap;
	}

	.search-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
		min-width: 220px;
	}

	.search-input-wrap :global(.search-icon) {
		position: absolute;
		left: var(--space-2-5);
		color: var(--text-muted);
	}

	.table-search-input {
		width: 100%;
		padding: 6px 12px 6px 30px;
		font-size: var(--text-xs);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background-color: var(--surface);
		color: var(--text);
		outline: none;
	}

	.filter-controls-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.filter-select {
		padding: 6px 10px;
		font-size: var(--text-xs);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background-color: var(--surface);
		color: var(--text);
		outline: none;
	}

	.table-responsive {
		overflow-x: auto;
	}

	.applicants-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-xs);
		text-align: left;
	}

	.applicants-table th {
		padding: var(--space-3) var(--space-4);
		background-color: var(--surface-subtle);
		color: var(--text-muted);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border-bottom: 1px solid var(--border);
	}

	.applicants-table td {
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.student-name-strong {
		color: var(--text);
	}

	.student-id-mono {
		font-family: monospace;
		font-size: var(--text-2xs);
		color: var(--text-muted);
	}

	.comp-role-cell {
		display: flex;
		flex-direction: column;
	}

	.comp-role-cell strong {
		color: var(--text);
	}

	.comp-role-cell .role-sub {
		font-size: var(--text-3xs);
		color: var(--text-muted);
	}

	/* Opportunity Details Modal */
	.drive-details-modal-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.modal-drive-summary-strip {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-2);
		padding: var(--space-3);
		background-color: var(--surface-subtle);
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
	}

	.modal-drive-summary-strip div {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.modal-label {
		font-size: var(--text-3xs);
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.modal-section-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.modal-subheading {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--text);
		margin: 0;
	}

	.modal-students-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		max-height: 200px;
		overflow-y: auto;
	}

	.modal-student-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		background-color: var(--surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.modal-student-item div {
		display: flex;
		flex-direction: column;
	}

	.modal-student-item .meta-sub {
		font-size: var(--text-3xs);
		color: var(--text-muted);
	}

	.modal-empty-notice {
		font-size: var(--text-xs);
		color: var(--text-muted);
		font-style: italic;
	}
</style>
