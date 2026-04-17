<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Search state — mirrors the current URL param so the input stays in sync on nav
	let searchValue = $state('');
	$effect(() => {
		searchValue = data.q ?? '';
	});
	let searchTimer: ReturnType<typeof setTimeout>;

	// Rebuild URLSearchParams from current data + overrides; always resets to page 1
	function buildParams(overrides: Record<string, string | null | undefined> = {}): string {
		const base: Record<string, string | null | undefined> = {
			q: data.q,
			tag: data.tag
		};
		const merged = { ...base, ...overrides };
		const params = new URLSearchParams();
		for (const [k, v] of Object.entries(merged)) {
			if (v != null && v !== '') params.set(k, v);
		}
		const qs = params.toString();
		return qs ? `?${qs}` : '?';
	}

	function pageUrl(p: number): string {
		const base: Record<string, string | null | undefined> = {
			q: data.q,
			tag: data.tag
		};
		const params = new URLSearchParams();
		for (const [k, v] of Object.entries(base)) {
			if (v != null && v !== '') params.set(k, v);
		}
		if (p > 1) params.set('page', String(p));
		const qs = params.toString();
		return qs ? `?${qs}` : '?';
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			if (searchValue.length >= 2 || searchValue.length === 0) {
				goto(buildParams({ q: searchValue || null }), {
					keepFocus: true,
					noScroll: true,
					replaceState: true
				});
			}
		}, 400);
	}

	function setTag(t: string | null) {
		goto(buildParams({ tag: t }), { noScroll: true });
	}

	function clearAll() {
		searchValue = '';
		goto('/recipes', { noScroll: true });
	}

	const hasFilters = $derived(!!(data.q || data.tag));
</script>

<svelte:head>
	<title>Browse Recipes — Recipe Roost</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page header -->
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Browse Recipes</h1>
		<p class="mt-1 text-sm text-gray-500">
			{data.total}
			{data.total === 1 ? 'recipe' : 'recipes'}
			{hasFilters ? 'match your search' : 'published'}
		</p>
	</div>

	<!-- Search bar -->
	<div class="relative">
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
			<svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
			</svg>
		</div>
		<input
			type="search"
			placeholder="Search recipes…"
			bind:value={searchValue}
			oninput={handleSearchInput}
			class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
		/>
	</div>

	<!-- Tag filter row (only shown when there are tags) -->
	{#if data.allTags.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each data.allTags as tag (tag.id)}
				<button
					onclick={() => setTag(data.tag === tag.name ? null : tag.name)}
					class="rounded-full px-3 py-1 text-xs font-medium transition {data.tag === tag.name
						? 'bg-orange-500 text-white'
						: 'bg-orange-50 text-orange-700 hover:bg-orange-100'}"
				>
					{tag.name}
				</button>
			{/each}
		</div>
	{/if}

	{#if hasFilters}
		<div>
			<button
				onclick={clearAll}
				class="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
			>
				Clear filters ×
			</button>
		</div>
	{/if}

	<!-- Results -->
	{#if data.recipes.length === 0}
		<div class="py-24 text-center">
			{#if hasFilters}
				<p class="text-lg text-gray-400">No recipes match your search.</p>
				<button
					onclick={clearAll}
					class="mt-4 inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
				>
					Clear filters
				</button>
			{:else}
				<p class="text-lg text-gray-400">No recipes yet. Be the first to share one!</p>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.recipes as recipe (recipe.id)}
				<a
					href="/recipes/{recipe.id}"
					class="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
				>
					<!-- Image -->
					<div class="aspect-video w-full overflow-hidden bg-gray-100">
						{#if recipe.imageUrl}
							<img
								src={recipe.imageUrl}
								alt={recipe.title}
								class="h-full w-full object-cover transition group-hover:scale-105"
							/>
						{:else}
							<div class="flex h-full items-center justify-center text-4xl text-gray-300">🍽️</div>
						{/if}
					</div>

					<!-- Body -->
					<div class="flex flex-1 flex-col gap-2 p-4">
						<h2 class="line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-orange-600">
							{recipe.title}
						</h2>

						{#if recipe.description}
							<p class="line-clamp-2 text-sm text-gray-500">{recipe.description}</p>
						{/if}

						<p class="mt-auto pt-2 text-xs text-gray-400">By {recipe.authorName}</p>
					</div>
				</a>
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.totalPages > 1}
			<nav class="flex items-center justify-center gap-2 pt-4">
				{#if data.page > 1}
					<a
						href={pageUrl(data.page - 1)}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Previous
					</a>
				{/if}

				<span class="text-sm text-gray-500">Page {data.page} of {data.totalPages}</span>

				{#if data.page < data.totalPages}
					<a
						href={pageUrl(data.page + 1)}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Next
					</a>
				{/if}
			</nav>
		{/if}
	{/if}
</div>
