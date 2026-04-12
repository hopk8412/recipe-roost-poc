<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const isAuthor = $derived(data.currentUserId === data.recipe.authorId);
	const isSaved = $derived(form != null ? (form as { saved: boolean }).saved : data.isSaved);
</script>

<svelte:head>
	<title>{data.recipe.title} — Recipe Roost</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-8">
	<!-- Header -->
	<div class="space-y-4">
		<div class="flex items-start justify-between gap-4">
			<h1 class="text-3xl font-bold text-gray-900">{data.recipe.title}</h1>

			<div class="flex shrink-0 gap-2">
				<!-- Save / Unsave button (logged-in non-authors only) -->
				{#if data.currentUserId && !isAuthor}
					<form
						method="post"
						action={isSaved ? '?/unsave' : '?/save'}
						use:enhance
					>
						<button
							type="submit"
							class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition {isSaved
								? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
								: 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}"
						>
							{#if isSaved}
								<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M5 3a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2H5z" />
								</svg>
								Saved
							{:else}
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 3a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2H5z" />
								</svg>
								Save
							{/if}
						</button>
					</form>
				{/if}

				<!-- Author controls -->
				{#if isAuthor}
					<a
						href="/recipes/{data.recipe.id}/edit"
						class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Edit
					</a>
					<form method="post" action="/recipes/{data.recipe.id}/delete" use:enhance>
						<button
							type="submit"
							class="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
							onclick={(e) => {
								if (!confirm('Delete this recipe?')) e.preventDefault();
							}}
						>
							Delete
						</button>
					</form>
				{/if}
			</div>
		</div>

		<!-- Draft badge -->
		{#if !data.recipe.isPublished}
			<span class="inline-block rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
				Draft — not publicly visible
			</span>
		{/if}

		<!-- Meta row -->
		<div class="flex flex-wrap items-center gap-3 text-sm text-gray-500">
			<span>By <strong class="text-gray-700">{data.recipe.authorName}</strong></span>
		</div>

		{#if data.recipe.tags.length > 0}
			<div class="flex flex-wrap gap-2">
				{#each data.recipe.tags as tag (tag.id)}
					<a
						href="/recipes?tag={encodeURIComponent(tag.name)}"
						class="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
					>
						{tag.name}
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Cover image -->
	{#if data.recipe.imageUrl}
		<div class="overflow-hidden rounded-2xl border border-gray-200">
			<img src={data.recipe.imageUrl} alt={data.recipe.title} class="w-full object-cover" />
		</div>
	{/if}

	<!-- Description -->
	{#if data.recipe.description}
		<p class="leading-relaxed text-gray-700">{data.recipe.description}</p>
	{/if}

	<!-- Ingredients -->
	{#if data.recipe.ingredients.length > 0}
		<section class="space-y-3">
			<h2 class="text-xl font-semibold text-gray-900">Ingredients</h2>
			<ul class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
				{#each data.recipe.ingredients as ing (ing.id)}
					<li class="flex items-center gap-3 px-4 py-3 text-sm text-gray-700">
						<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400"></span>
						<span class="font-medium">{ing.quantity}{ing.unit ? ' ' + ing.unit : ''}</span>
						<span>{ing.name}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Steps -->
	{#if data.recipe.steps.length > 0}
		<section class="space-y-4">
			<h2 class="text-xl font-semibold text-gray-900">Instructions</h2>
			<ol class="space-y-4">
				{#each data.recipe.steps as step (step.id)}
					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700"
						>
							{step.stepNumber}
						</span>
						<p class="pt-1 text-sm leading-relaxed text-gray-700">{step.instruction}</p>
					</li>
				{/each}
			</ol>
		</section>
	{/if}
</div>
