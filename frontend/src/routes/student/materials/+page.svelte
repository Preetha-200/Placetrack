<script lang="ts">
	import type { PageData } from './$types';
	import {
		materialsStore,
		type StudyMaterial,
		type MaterialCategory
	} from '$lib/materials/materialsStore.svelte';
	import { studentStore } from '$lib/student/store.svelte';
	import { PageHeader, Card, EmptyState, Skeleton, Button } from '$lib/components/ui';
	import {
		MaterialsToolbar,
		MaterialCard,
		MaterialPreviewModal
	} from '$lib/student/components';
	import FolderOpen from '@lucide/svelte/icons/folder-open';

	let { data }: { data: PageData } = $props();

	// Search & Filtering State
	let searchQuery = $state('');
	let selectedCategory = $state<'all' | MaterialCategory>('all');
	let filterOnlyMyBatch = $state(false);
	let sortBy = $state<'newest' | 'downloads' | 'title'>('newest');

	// Modal State
	let isPreviewOpen = $state(false);
	let activePreviewMaterial = $state<StudyMaterial | null>(null);
	let recentlyDownloadedIds = $state<Set<string>>(new Set());

	// Normalize materials from PostgreSQL or fallback store
	const allMaterials = $derived.by<StudyMaterial[]>(() => {
		if (data.materials && data.materials.length > 0) {
			return (data.materials as any[]).map((m: any) => ({
				id: m.id,
				title: m.title,
				description: m.description,
				category: m.category as MaterialCategory,
				categoryLabel: m.category_label || m.categoryLabel || 'Quantitative Aptitude',
				subject: m.subject || 'General',
				skill: m.skill || 'General Aptitude',
				targetBatch: m.target_batch || m.targetBatch || 'All Batches',
				targetStudentId: m.target_student_id || m.targetStudentId || 'all',
				fileName: m.file_name || m.fileName || 'document.pdf',
				fileType: (m.file_type || m.fileType || 'pdf') as any,
				mimeType: m.mime_type || m.mimeType || 'application/pdf',
				fileSize: m.file_size || m.fileSize || 0,
				fileSizeFormatted: m.file_size_formatted || m.fileSizeFormatted || '1 MB',
				filePath: m.file_path || m.filePath,
				previewText: m.preview_text || m.previewText || m.description,
				uploadedBy: {
					id: m.uploaded_by_id || m.uploadedBy?.id || 'usr_trainer_01',
					name: m.uploaded_by_name || m.uploadedBy?.name || 'Prof. David Chen',
					email: m.uploaded_by_email || m.uploadedBy?.email || 'trainer@placetrack.ai',
					role: 'TRAINER'
				},
				uploadedAt: new Date(m.created_at || Date.now()).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				}),
				uploadedTimestamp: new Date(m.created_at || Date.now()).getTime(),
				downloadsCount: m.downloads_count ?? m.downloadsCount ?? 0,
				viewsCount: m.views_count ?? m.viewsCount ?? 0,
				tags: m.tags || [],
				importance: m.importance || 'Normal'
			}));
		}
		return materialsStore.materials;
	});

	// Derived filtered & sorted list
	const filteredMaterials = $derived.by(() => {
		let list = allMaterials;

		// 1. Category Filter
		if (selectedCategory !== 'all') {
			list = list.filter((m) => m.category === selectedCategory);
		}

		// 2. Batch Filter
		if (filterOnlyMyBatch) {
			const studentBatch = studentStore.profile.batch;
			list = list.filter(
				(m) => m.targetBatch === 'All Batches' || m.targetBatch === studentBatch
			);
		}

		// 3. Search Query
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(m) =>
					m.title.toLowerCase().includes(q) ||
					m.description.toLowerCase().includes(q) ||
					m.fileName.toLowerCase().includes(q) ||
					m.uploadedBy.name.toLowerCase().includes(q) ||
					m.tags.some((t: string) => t.toLowerCase().includes(q))
			);
		}

		// 4. Sorting
		return [...list].sort((a, b) => {
			if (sortBy === 'newest') {
				return b.uploadedTimestamp - a.uploadedTimestamp;
			} else if (sortBy === 'downloads') {
				return b.downloadsCount - a.downloadsCount;
			} else {
				return a.title.localeCompare(b.title);
			}
		});
	});

	// Categories list with counts
	const categoriesList = $derived.by(() => {
		return [
			{ id: 'all' as const, label: 'All Materials', count: allMaterials.length },
			{
				id: 'aptitude' as const,
				label: 'Quantitative Aptitude',
				count: allMaterials.filter((m) => m.category === 'aptitude').length
			},
			{
				id: 'verbal' as const,
				label: 'Verbal Ability',
				count: allMaterials.filter((m) => m.category === 'verbal').length
			},
			{
				id: 'logical' as const,
				label: 'Logical Reasoning',
				count: allMaterials.filter((m) => m.category === 'logical').length
			},
			{
				id: 'technical' as const,
				label: 'Technical & Coding',
				count: allMaterials.filter((m) => m.category === 'technical').length
			},
			{
				id: 'company_prep' as const,
				label: 'Company Drives',
				count: allMaterials.filter((m) => m.category === 'company_prep').length
			},
			{
				id: 'interview_prep' as const,
				label: 'Interview Prep',
				count: allMaterials.filter((m) => m.category === 'interview_prep').length
			}
		];
	});

	function handleDownload(material: StudyMaterial, event?: Event) {
		if (event) event.stopPropagation();
		materialsStore.downloadFile(material);

		// Visual feedback
		recentlyDownloadedIds.add(material.id);
		recentlyDownloadedIds = new Set(recentlyDownloadedIds);
		setTimeout(() => {
			recentlyDownloadedIds.delete(material.id);
			recentlyDownloadedIds = new Set(recentlyDownloadedIds);
		}, 4000);
	}

	function openPreview(material: StudyMaterial) {
		materialsStore.recordView(material.id);
		activePreviewMaterial = material;
		isPreviewOpen = true;
	}

	function resetFilters() {
		searchQuery = '';
		selectedCategory = 'all';
		filterOnlyMyBatch = false;
		sortBy = 'newest';
	}
</script>

<svelte:head>
	<title>Study Materials & Resources | Placement Tracker</title>
</svelte:head>

<div class="materials-page">
	<PageHeader
		title="Study Materials & Resources"
		subtitle="Access formula handbooks, coding cheat sheets, and company drive preparation playbooks published by trainers"
		breadcrumb={[
			{ label: 'Student', href: '/student/profile' },
			{ label: 'Study Materials' }
		]}
	/>

	<!-- Interactive Toolbar -->
	<MaterialsToolbar
		bind:searchQuery
		bind:selectedCategory
		bind:sortBy
		bind:filterOnlyMyBatch
		{categoriesList}
		resultCount={filteredMaterials.length}
		batchName={studentStore.profile.batch.split(' ')[0] || 'My Batch'}
		onResetFilters={resetFilters}
	/>

	<!-- Grid or Fallback State -->
	{#if !allMaterials}
		<div class="materials-grid">
			{#each Array(6) as _}
				<Card padding="md">
					<div class="skeleton-card-inner">
						<div class="skeleton-row">
							<Skeleton width="60px" height="20px" />
							<Skeleton width="100px" height="20px" />
						</div>
						<Skeleton width="80%" height="22px" />
						<Skeleton width="100%" height="36px" />
						<Skeleton width="100%" height="48px" />
						<div class="skeleton-row">
							<Skeleton width="48%" height="32px" />
							<Skeleton width="48%" height="32px" />
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{:else if filteredMaterials.length === 0}
		<Card>
			<EmptyState
				title="No matching materials found"
				description="No study materials match your current search query or filter criteria. Try resetting the filters or searching with different keywords."
			>
				{#snippet icon()}
					<FolderOpen size={36} />
				{/snippet}
				{#snippet action()}
					<Button variant="secondary" size="sm" onclick={resetFilters}>
						View All Materials
					</Button>
				{/snippet}
			</EmptyState>
		</Card>
	{:else}
		<div class="materials-grid">
			{#each filteredMaterials as material (material.id)}
				<MaterialCard
					{material}
					isDownloaded={recentlyDownloadedIds.has(material.id)}
					onPreview={openPreview}
					onDownload={handleDownload}
				/>
			{/each}
		</div>
	{/if}

	<!-- Document Reader & Preview Modal -->
	<MaterialPreviewModal
		bind:open={isPreviewOpen}
		material={activePreviewMaterial}
		onDownload={handleDownload}
	/>
</div>

<style>
	.materials-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding-bottom: var(--space-8);
	}

	.materials-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4);
	}

	@media (max-width: 1024px) {
		.materials-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.materials-grid {
			grid-template-columns: 1fr;
		}
	}

	.skeleton-card-inner {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.skeleton-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}
</style>
