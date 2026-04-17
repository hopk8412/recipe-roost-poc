<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import type { PageData } from './$types';
	import { recipeFormSchema, RANKS, RANK_BADGE_CLASSES } from '$lib/recipe-form';

	let { data }: { data: PageData } = $props();

	const { form, errors, message, enhance, submitting } = superForm(untrack(() => data.form), {
		validators: zod4Client(recipeFormSchema)
	});

	// ─── Ingredient list state ─────────────────────────────────────────────────
	type Ingredient = { name: string; quantity: string; unit: string };
	let ingredientsList = $state<Ingredient[]>([{ name: '', quantity: '', unit: '' }]);

	function addIngredient() {
		ingredientsList = [...ingredientsList, { name: '', quantity: '', unit: '' }];
	}
	function removeIngredient(i: number) {
		if (ingredientsList.length > 1) ingredientsList = ingredientsList.filter((_, idx) => idx !== i);
	}

	// ─── Step list state ───────────────────────────────────────────────────────
	type Step = { instruction: string };
	let stepsList = $state<Step[]>([{ instruction: '' }]);

	// ─── Rank state ────────────────────────────────────────────────────────────
	let selectedRank = $state<string>('');

	function addStep() {
		stepsList = [...stepsList, { instruction: '' }];
	}
	function removeStep(i: number) {
		if (stepsList.length > 1) stepsList = stepsList.filter((_, idx) => idx !== i);
	}
</script>

<svelte:head>
	<title>New Recipe — Recipe Roost</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-8">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">New Recipe</h1>
		<p class="mt-1 text-sm text-gray-500">Share something delicious with the world.</p>
	</div>

	{#if $message}
		<div class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{$message}</div>
	{/if}

	<form
		method="post"
		enctype="multipart/form-data"
		use:enhance
		class="space-y-8"
	>
		<!-- Hidden serialised lists + rank -->
		<input type="hidden" name="ingredientsJson" value={JSON.stringify(ingredientsList)} />
		<input type="hidden" name="stepsJson" value={JSON.stringify(stepsList)} />
		<input type="hidden" name="rank" value={selectedRank} />

		<!-- ── Basic info ──────────────────────────────────────────────────── -->
		<section class="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500">Basic Info</h2>

			<div>
				<label for="title" class="block text-sm font-medium text-gray-700">Title <span class="text-red-500">*</span></label>
				<input
					id="title"
					name="title"
					type="text"
					bind:value={$form.title}
					class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
					class:border-red-500={$errors.title}
					placeholder="e.g. Creamy Mushroom Pasta"
				/>
				{#if $errors.title}<p class="mt-1 text-xs text-red-600">{$errors.title}</p>{/if}
			</div>

			<div>
				<label for="description" class="block text-sm font-medium text-gray-700">Description</label>
				<textarea
					id="description"
					name="description"
					bind:value={$form.description}
					rows="3"
					class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
					placeholder="A short description of your recipe…"
				></textarea>
			</div>

			<div>
				<label for="image" class="block text-sm font-medium text-gray-700">Cover Image</label>
				<input
					id="image"
					name="image"
					type="file"
					accept="image/*"
					class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-orange-700 hover:file:bg-orange-100"
				/>
			</div>
		</section>

		<!-- ── Ingredients ────────────────────────────────────────────────── -->
		<section class="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500">Ingredients</h2>

			{#each ingredientsList as ing, i (i)}
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={ing.name}
						placeholder="Ingredient"
						class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
					/>
					<input
						type="text"
						bind:value={ing.quantity}
						placeholder="Qty"
						class="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
					/>
					<input
						type="text"
						bind:value={ing.unit}
						placeholder="Unit"
						class="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
					/>
					<button
						type="button"
						onclick={() => removeIngredient(i)}
						disabled={ingredientsList.length === 1}
						class="rounded-lg border border-gray-300 px-2 py-2 text-gray-400 hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
						aria-label="Remove ingredient"
					>
						✕
					</button>
				</div>
			{/each}

			<button
				type="button"
				onclick={addIngredient}
				class="text-sm font-medium text-orange-600 hover:text-orange-500"
			>
				+ Add ingredient
			</button>
		</section>

		<!-- ── Steps ──────────────────────────────────────────────────────── -->
		<section class="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500">Steps</h2>

			{#each stepsList as step, i (i)}
				<div class="flex gap-2">
					<span
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700"
					>
						{i + 1}
					</span>
					<textarea
						bind:value={step.instruction}
						rows="2"
						placeholder="Describe this step…"
						class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
					></textarea>
					<button
						type="button"
						onclick={() => removeStep(i)}
						disabled={stepsList.length === 1}
						class="self-start rounded-lg border border-gray-300 px-2 py-2 text-gray-400 hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
						aria-label="Remove step"
					>
						✕
					</button>
				</div>
			{/each}

			<button
				type="button"
				onclick={addStep}
				class="text-sm font-medium text-orange-600 hover:text-orange-500"
			>
				+ Add step
			</button>
		</section>

		<!-- ── Tags & publish ─────────────────────────────────────────────── -->
		<section class="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500">Tags & Visibility</h2>

			<div>
				<label for="tags" class="block text-sm font-medium text-gray-700">Tags</label>
				<input
					id="tags"
					name="tags"
					type="text"
					bind:value={$form.tags}
					class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
					placeholder="breakfast, vegetarian, quick"
				/>
				<p class="mt-1 text-xs text-gray-400">Comma-separated</p>
			</div>

			<div>
				<p class="mb-2 block text-sm font-medium text-gray-700">Rank <span class="text-gray-400">(optional)</span></p>
				<div class="flex flex-wrap gap-2">
					{#each RANKS as r}
						<button
							type="button"
							onclick={() => (selectedRank = selectedRank === r ? '' : r)}
							class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition {selectedRank === r
								? RANK_BADGE_CLASSES[r]
								: 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
						>
							{r}
						</button>
					{/each}
					{#if selectedRank}
						<button
							type="button"
							onclick={() => (selectedRank = '')}
							class="rounded-full px-3 py-1 text-xs font-medium text-gray-400 hover:text-gray-600"
						>
							Clear
						</button>
					{/if}
				</div>
			</div>

			<label class="flex cursor-pointer items-center gap-3">
				<input
					name="isPublished"
					type="checkbox"
					bind:checked={$form.isPublished}
					class="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
				/>
				<span class="text-sm font-medium text-gray-700">Publish this recipe</span>
			</label>
		</section>

		<!-- ── Submit ─────────────────────────────────────────────────────── -->
		<div class="flex items-center justify-between">
			<a href="/dashboard" class="text-sm text-gray-500 hover:text-gray-700">Cancel</a>
			<button
				type="submit"
				disabled={$submitting}
				class="rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
			>
				{$submitting ? 'Saving…' : 'Save Recipe'}
			</button>
		</div>
	</form>
</div>
