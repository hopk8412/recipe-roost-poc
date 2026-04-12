<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'my-recipes' | 'saved'>('my-recipes');
</script>

<svelte:head>
	<title>Dashboard — Recipe Roost</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Welcome back, {data.user.name}!</h1>
			<p class="mt-1 text-sm text-gray-500">Manage your recipes and discover new favourites.</p>
		</div>
		<a
			href="/recipes/new"
			class="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500"
		>
			+ New Recipe
		</a>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex gap-6">
			<button
				onclick={() => (activeTab = 'my-recipes')}
				class="border-b-2 pb-3 text-sm font-medium transition {activeTab === 'my-recipes'
					? 'border-orange-500 text-orange-600'
					: 'border-transparent text-gray-500 hover:text-gray-700'}"
			>
				My Recipes
				{#if data.myRecipes.length > 0}
					<span class="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
						{data.myRecipes.length}
					</span>
				{/if}
			</button>
			<button
				onclick={() => (activeTab = 'saved')}
				class="border-b-2 pb-3 text-sm font-medium transition {activeTab === 'saved'
					? 'border-orange-500 text-orange-600'
					: 'border-transparent text-gray-500 hover:text-gray-700'}"
			>
				Saved Recipes
				{#if data.savedRecipes.length > 0}
					<span class="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
						{data.savedRecipes.length}
					</span>
				{/if}
			</button>
		</nav>
	</div>

	<!-- My Recipes tab -->
	{#if activeTab === 'my-recipes'}
		{#if data.myRecipes.length === 0}
			<div class="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
				<p class="text-gray-400">You haven't created any recipes yet.</p>
				<a
					href="/recipes/new"
					class="mt-4 inline-block rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
				>
					Create your first recipe
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.myRecipes as recipe (recipe.id)}
					<div class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md">
						<div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
							{#if recipe.imageUrl}
								<img src={recipe.imageUrl} alt={recipe.title} class="h-full w-full object-cover" />
							{:else}
								<span class="text-2xl text-gray-300">🍽️</span>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<a
								href="/recipes/{recipe.id}"
								class="block truncate text-sm font-medium text-gray-900 hover:text-orange-600"
							>
								{recipe.title}
							</a>
							<div class="mt-1 flex items-center gap-2">
								{#if !recipe.isPublished}
									<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
										Draft
									</span>
								{/if}
							</div>
						</div>
						<a
							href="/recipes/{recipe.id}/edit"
							class="shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-orange-300 hover:text-orange-600"
						>
							Edit
						</a>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Saved Recipes tab -->
	{#if activeTab === 'saved'}
		{#if data.savedRecipes.length === 0}
			<div class="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
				<p class="text-gray-400">No saved recipes yet.</p>
				<a
					href="/recipes"
					class="mt-4 inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
				>
					Browse recipes
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.savedRecipes as recipe (recipe.id)}
					<a
						href="/recipes/{recipe.id}"
						class="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
					>
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
						<div class="flex flex-1 flex-col gap-2 p-4">
							<div class="flex items-start justify-between gap-2">
								<h2 class="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-orange-600">
									{recipe.title}
								</h2>
							</div>
							<p class="mt-auto text-xs text-gray-400">By {recipe.authorName}</p>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>
