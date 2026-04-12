<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { LayoutServerData } from './$types';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();

	const adminNavLinks = [
		{ href: '/admin/users', label: 'Users' }
		// Future: { href: '/admin/recipes', label: 'Recipes' }
		// Future: { href: '/admin/analytics', label: 'Analytics' }
	];
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Site header -->
	<header class="border-b border-gray-200 bg-white shadow-sm">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
			<div class="flex items-center gap-4">
				<a href="/dashboard" class="flex items-center gap-2 text-xl font-bold text-orange-600">
					🍳 Recipe Roost
				</a>
				<span class="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
					Admin
				</span>
			</div>

			<div class="flex items-center gap-4">
				<a href="/dashboard" class="text-sm text-gray-500 hover:text-orange-600">← Back to App</a>
				<span class="text-sm text-gray-700">{data.user.name}</span>
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
	</header>

	<div class="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
		<!-- Sidebar nav -->
		<aside class="w-48 shrink-0">
			<nav class="space-y-1">
				{#each adminNavLinks as link (link.href)}
					<a
						href={link.href}
						class="block rounded-lg px-3 py-2 text-sm font-medium transition {page.url.pathname.startsWith(link.href)
							? 'bg-orange-50 text-orange-700'
							: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
					>
						{link.label}
					</a>
				{/each}
			</nav>
		</aside>

		<!-- Page content -->
		<main class="min-w-0 flex-1">
			{@render children()}
		</main>
	</div>
</div>
