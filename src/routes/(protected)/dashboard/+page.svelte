<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Dashboard — Recipe Roost</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Welcome back, {data.user.name}!</h1>
		<p class="mt-1 text-sm text-gray-500">Manage your recipes and discover new favourites.</p>
	</div>

	<!-- Placeholder cards — Phase 3 will populate these -->
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<div class="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
			<div class="text-4xl">🥘</div>
			<h2 class="mt-3 text-sm font-semibold text-gray-700">My Recipes</h2>
			<p class="mt-1 text-xs text-gray-500">Your recipes will appear here in Phase 3.</p>
		</div>

		<div class="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
			<div class="text-4xl">🔖</div>
			<h2 class="mt-3 text-sm font-semibold text-gray-700">Saved Recipes</h2>
			<p class="mt-1 text-xs text-gray-500">Bookmarked recipes will appear here in Phase 4.</p>
		</div>

		<div class="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
			<div class="text-4xl">✨</div>
			<h2 class="mt-3 text-sm font-semibold text-gray-700">Discover</h2>
			<p class="mt-1 text-xs text-gray-500">Search and filters coming in Phase 4.</p>
		</div>
	</div>
</div>
