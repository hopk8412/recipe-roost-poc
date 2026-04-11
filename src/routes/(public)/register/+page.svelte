<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { z } from 'zod';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const registerSchema = z
		.object({
			name: z.string().min(2, { error: 'Name must be at least 2 characters' }),
			email: z.string().check(z.email({ error: 'Please enter a valid email address' })),
			password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
			confirmPassword: z.string()
		})
		.refine((d) => d.password === d.confirmPassword, {
			error: "Passwords don't match",
			path: ['confirmPassword']
		});

	const { form, errors, message, enhance, submitting } = superForm(
		untrack(() => data.form),
		{ validators: zod4Client(registerSchema) }
	);
</script>

<svelte:head>
	<title>Create Account — Recipe Roost</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
	<div class="w-full max-w-md space-y-8">
		<!-- Logo / brand -->
		<div class="text-center">
			<a href="/" class="inline-flex items-center gap-2 text-2xl font-bold text-orange-600">
				🍳 Recipe Roost
			</a>
			<h1 class="mt-4 text-3xl font-bold tracking-tight text-gray-900">Create your account</h1>
			<p class="mt-2 text-sm text-gray-600">
				Already have an account?
				<a href="/login" class="font-medium text-orange-600 hover:text-orange-500">Sign in</a>
			</p>
		</div>

		<!-- Card -->
		<div class="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
			{#if $message}
				<div class="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
					{$message}
				</div>
			{/if}

			<form method="post" use:enhance class="space-y-5">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700">Full name</label>
					<input
						id="name"
						name="name"
						type="text"
						autocomplete="name"
						bind:value={$form.name}
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
						class:border-red-500={$errors.name}
						placeholder="Jane Smith"
					/>
					{#if $errors.name}
						<p class="mt-1 text-xs text-red-600">{$errors.name}</p>
					{/if}
				</div>

				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						bind:value={$form.email}
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
						class:border-red-500={$errors.email}
						placeholder="you@example.com"
					/>
					{#if $errors.email}
						<p class="mt-1 text-xs text-red-600">{$errors.email}</p>
					{/if}
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						bind:value={$form.password}
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
						class:border-red-500={$errors.password}
						placeholder="••••••••"
					/>
					{#if $errors.password}
						<p class="mt-1 text-xs text-red-600">{$errors.password}</p>
					{/if}
				</div>

				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-700"
						>Confirm password</label
					>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
						bind:value={$form.confirmPassword}
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
						class:border-red-500={$errors.confirmPassword}
						placeholder="••••••••"
					/>
					{#if $errors.confirmPassword}
						<p class="mt-1 text-xs text-red-600">{$errors.confirmPassword}</p>
					{/if}
				</div>

				<button
					type="submit"
					disabled={$submitting}
					class="flex w-full justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
				>
					{$submitting ? 'Creating account…' : 'Create account'}
				</button>
			</form>
		</div>
	</div>
</div>
