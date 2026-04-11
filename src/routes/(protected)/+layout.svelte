<script lang="ts">
	import { enhance } from '$app/forms';
	import type { LayoutServerData } from './$types';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Site header -->
	<header class="border-b border-gray-200 bg-white shadow-sm">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
			<!-- Brand -->
			<a href="/dashboard" class="flex items-center gap-2 text-xl font-bold text-orange-600">
				🍳 Recipe Roost
			</a>

			<!-- Nav + user area -->
			<div class="flex items-center gap-4">
				<nav class="hidden items-center gap-6 text-sm font-medium text-gray-600 sm:flex">
					<a href="/dashboard" class="hover:text-orange-600">My Recipes</a>
				</nav>

				<div class="flex items-center gap-3">
					<span class="text-sm text-gray-700">
						{data.user.name}
					</span>
					<form method="post" action="/sign-out" use:enhance>
						<button
							type="submit"
							class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-orange-600 focus:ring-2 focus:ring-orange-500 focus:outline-none"
						>
							Sign out
						</button>
					</form>
				</div>
			</div>
		</div>
	</header>

	<!-- Page content -->
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{@render children()}
	</main>
</div>
