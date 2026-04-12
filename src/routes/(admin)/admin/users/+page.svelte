<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Users — Admin — Recipe Roost</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page header -->
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Users</h1>
		<p class="mt-1 text-sm text-gray-500">
			{data.total} total {data.total === 1 ? 'user' : 'users'}
		</p>
	</div>

	<!-- Action feedback -->
	{#if form?.error}
		<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<!-- User table -->
	<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
						Name
					</th>
					<th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
						Email
					</th>
					<th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
						Joined
					</th>
					<th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
						Role
					</th>
					<th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
						Actions
					</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100 bg-white">
				{#each data.users as u (u.id)}
					<tr class="transition hover:bg-gray-50">
						<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
							{u.name}
						</td>
						<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
							{u.email}
						</td>
						<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
							{new Date(u.createdAt).toLocaleDateString('en-GB', {
								day: 'numeric',
								month: 'short',
								year: 'numeric'
							})}
						</td>
						<td class="whitespace-nowrap px-6 py-4">
							{#if u.isAdmin}
								<span
									class="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700"
								>
									Admin
								</span>
							{:else}
								<span
									class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500"
								>
									User
								</span>
							{/if}
						</td>
						<td class="whitespace-nowrap px-6 py-4 text-right">
							{#if u.isAdmin}
								<form method="post" action="?/revokeAdmin" use:enhance>
									<input type="hidden" name="userId" value={u.id} />
									<button
										type="submit"
										class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
										title="You cannot revoke your own admin role"
									>
										Revoke Admin
									</button>
								</form>
							{:else}
								<form method="post" action="?/grantAdmin" use:enhance>
									<input type="hidden" name="userId" value={u.id} />
									<button
										type="submit"
										class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
									>
										Grant Admin
									</button>
								</form>
							{/if}
						</td>
					</tr>
				{/each}

				{#if data.users.length === 0}
					<tr>
						<td colspan="5" class="px-6 py-12 text-center text-sm text-gray-400">
							No users found.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if data.totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-gray-500">
				Page {data.page} of {data.totalPages} — {data.total} users
			</p>
			<div class="flex gap-2">
				{#if data.page > 1}
					<a
						href="?page={data.page - 1}"
						class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						← Previous
					</a>
				{/if}
				{#if data.page < data.totalPages}
					<a
						href="?page={data.page + 1}"
						class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Next →
					</a>
				{/if}
			</div>
		</div>
	{/if}
</div>
