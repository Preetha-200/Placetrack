<script lang="ts">
	import { page } from '$app/state';
	import { pageState } from '$lib/trainer/pageState.svelte';
	import { AssessmentTable } from '$lib/trainer/components';

	$effect(() => {
		const isNew = page.url.searchParams.get('new');
		if (isNew === 'true') {
			pageState.openCreateAssessmentModal();
		}
	});
</script>

<svelte:head>
	<title>Campus Assessments | Placement Tracker Trainer</title>
</svelte:head>

<AssessmentTable />
