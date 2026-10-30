<script lang="ts">
	import AIQuizContainer from '$lib/student/AIQuizContainer.svelte';
</script>

<svelte:head>
	<title>Quantitative Aptitude | Placement Tracker</title>
</svelte:head>

<div class="module-page">
	<AIQuizContainer category="aptitude" />
</div>

<style>
	.module-page {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding-bottom: var(--space-8);
	}
</style>
