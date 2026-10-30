<script lang="ts">
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import DepartmentReadinessChart from '$lib/coordinator/components/DepartmentReadinessChart.svelte';
	import DepartmentComparisonTable from '$lib/coordinator/components/DepartmentComparisonTable.svelte';

	let { data }: { data: PageData } = $props();

	const analytics = $derived(data.analytics);
	const isLoading = $derived(!analytics);
</script>

<svelte:head>
	<title>MCA Batch & Cohort Analytics | Placement Tracker Coordinator</title>
</svelte:head>

<div class="departments-page">
	<PageHeader
		title="MCA Batch & Cohort Analytics"
		subtitle="Comprehensive readiness comparison, academic benchmarks, and recruitment yield across MCA batches."
	/>

	<!-- Horizontal SVG Bar Chart: Readiness Comparison -->
	<section aria-label="Readiness Comparison Chart">
		<DepartmentReadinessChart
			departments={analytics?.departmentStatistics}
			loading={isLoading}
		/>
	</section>

	<!-- Department Comparison Table with Column Sorting & Highlight Badges -->
	<section aria-label="Department Breakdown Table">
		<DepartmentComparisonTable
			departments={analytics?.departmentStatistics}
			loading={isLoading}
		/>
	</section>
</div>

<style>
	.departments-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		max-width: 1280px;
		width: 100%;
		margin: 0 auto;
	}
</style>
