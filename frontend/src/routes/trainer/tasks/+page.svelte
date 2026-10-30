<script lang="ts">
	import { page } from '$app/state';
	import { pageState } from '$lib/trainer/pageState.svelte';
	import { TasksPanel } from '$lib/trainer/components';

	$effect(() => {
		const isNew = page.url.searchParams.get('new');
		if (isNew === 'true') {
			pageState.openAssignTaskModal();
		}
	});
</script>

<svelte:head>
	<title>Training Tasks | Placement Tracker Trainer</title>
</svelte:head>

<TasksPanel />
