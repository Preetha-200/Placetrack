<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import DrivesTable from '$lib/coordinator/components/DrivesTable.svelte';
</script>

<svelte:head>
	<title>Campus Recruitment Drives | Placement Tracker Coordinator</title>
</svelte:head>

<div class="drives-page">
	<PageHeader
		title="Campus Recruitment Drives"
		subtitle="Manage company visiting schedules, candidate eligibility thresholds, and active applicant rosters."
	/>

	<DrivesTable />
</div>

<style>
	.drives-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		max-width: 1280px;
		width: 100%;
		margin: 0 auto;
	}
</style>
