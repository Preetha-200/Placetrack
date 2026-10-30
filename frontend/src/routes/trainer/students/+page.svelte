<script lang="ts">
	import { page } from '$app/state';
	import { pageState } from '$lib/trainer/pageState.svelte';
	import { StudentRoster } from '$lib/trainer/components';

	$effect(() => {
		const filter = page.url.searchParams.get('filter');
		if (filter === 'needs_improvement' || filter === 'needs-improvement') {
			pageState.selectedStatusFilter = 'Needs Improvement';
		}
	});
</script>

<svelte:head>
	<title>Students Roster & Status | Placement Tracker Trainer</title>
</svelte:head>

<StudentRoster />
