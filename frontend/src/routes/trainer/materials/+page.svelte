<script lang="ts">
	import { page } from '$app/state';
	import { pageState } from '$lib/trainer/pageState.svelte';
	import { MaterialsHub } from '$lib/trainer/components';

	$effect(() => {
		const isNew = page.url.searchParams.get('new');
		if (isNew === 'true') {
			pageState.openUploadMaterialModal();
		}
	});
</script>

<svelte:head>
	<title>Study Materials Hub | Placement Tracker Trainer</title>
</svelte:head>

<MaterialsHub />
