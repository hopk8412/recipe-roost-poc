/**
 * Shared schema and helpers for the recipe create/edit form.
 * Safe to import in both +page.server.ts and +page.svelte (no server-only deps).
 */
import { z } from 'zod';

export const recipeFormSchema = z.object({
	title: z.string().min(1, { error: 'Title is required' }).max(255),
	description: z.string().default(''),
	isPublished: z.boolean().default(false),
	tags: z.string().default(''),
	ingredientsJson: z
		.string()
		.default(JSON.stringify([{ name: '', quantity: '', unit: '' }])),
	stepsJson: z.string().default(JSON.stringify([{ instruction: '' }]))
});

export const ingredientRowSchema = z.array(
	z.object({
		name: z.string().min(1),
		quantity: z.string().min(1),
		unit: z.string().default('')
	})
);

export const stepRowSchema = z.array(z.object({ instruction: z.string().min(1) }));

export function parseTagNames(s: string): string[] {
	return s
		.split(',')
		.map((t) => t.trim().toLowerCase())
		.filter(Boolean);
}

export const RANKS = ['S', 'A', 'B', 'C', 'D'] as const;
export type Rank = (typeof RANKS)[number];

export const RANK_BADGE_CLASSES: Record<Rank, string> = {
	S: 'bg-amber-400 text-amber-950',
	A: 'bg-green-500 text-white',
	B: 'bg-blue-500 text-white',
	C: 'bg-violet-500 text-white',
	D: 'bg-gray-400 text-white'
};
