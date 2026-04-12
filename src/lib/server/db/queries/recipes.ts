import { db } from '$lib/server/db';
import {
	recipes,
	ingredients,
	steps,
	tags,
	recipeTags,
	savedRecipes,
	user
} from '$lib/server/db/schema';
import { eq, desc, asc, and, inArray, count as sqlCount, sql } from 'drizzle-orm';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecipeSummary = {
	id: string;
	authorId: string;
	authorName: string;
	title: string;
	description: string | null;
	imageUrl: string | null;
	isPublished: boolean;
	createdAt: Date;
};

export type RecipeFull = RecipeSummary & {
	updatedAt: Date;
	ingredients: { id: string; name: string; quantity: string; unit: string | null; sortOrder: number }[];
	steps: { id: string; stepNumber: number; instruction: string; imageUrl: string | null }[];
	tags: { id: string; name: string }[];
};

export type IngredientInput = { name: string; quantity: string; unit?: string };
export type StepInput = { instruction: string };

export type RecipeInput = {
	title: string;
	description?: string | null;
	imageUrl?: string | null;
	isPublished?: boolean;
	ingredients: IngredientInput[];
	steps: StepInput[];
	tagNames: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertTags(names: string[]): Promise<string[]> {
	if (names.length === 0) return [];
	await db.insert(tags).values(names.map((n) => ({ name: n }))).onConflictDoNothing();
	const rows = await db.select({ id: tags.id }).from(tags).where(inArray(tags.name, names));
	return rows.map((r) => r.id);
}

// ─── List published recipes (paginated, with optional search + filters) ───────

export type RecipeFilters = {
	q?: string;
	tag?: string;
};

export async function listPublishedRecipes(page = 1, limit = 12, filters: RecipeFilters = {}) {
	const offset = (page - 1) * limit;

	const q = filters.q?.trim();
	const whereClause = and(
		eq(recipes.isPublished, true),
		q ? sql`${recipes.searchVector} @@ plainto_tsquery('english', ${q})` : undefined,
		filters.tag
			? sql`EXISTS (
					SELECT 1 FROM recipe_tags rt
					JOIN tags t ON rt.tag_id = t.id
					WHERE rt.recipe_id = ${recipes.id} AND t.name = ${filters.tag}
				)`
			: undefined
	);

	const orderBy = q
		? desc(sql`ts_rank(${recipes.searchVector}, plainto_tsquery('english', ${q}))`)
		: desc(recipes.createdAt);

	const [rows, countRows] = await Promise.all([
		db
			.select({
				id: recipes.id,
				authorId: recipes.authorId,
				authorName: user.name,
				title: recipes.title,
				description: recipes.description,
				imageUrl: recipes.imageUrl,
				isPublished: recipes.isPublished,
				createdAt: recipes.createdAt
			})
			.from(recipes)
			.leftJoin(user, eq(recipes.authorId, user.id))
			.where(whereClause)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db.select({ total: sqlCount() }).from(recipes).where(whereClause)
	]);

	const total = countRows[0]?.total ?? 0;

	return {
		recipes: rows.map((r) => ({ ...r, authorName: r.authorName ?? 'Unknown' })) as RecipeSummary[],
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit),
		filters
	};
}

// ─── List all tags (that appear on at least one published recipe) ──────────────

export async function listAllTags(): Promise<{ id: string; name: string }[]> {
	return db
		.selectDistinct({ id: tags.id, name: tags.name })
		.from(tags)
		.innerJoin(recipeTags, eq(tags.id, recipeTags.tagId))
		.innerJoin(recipes, and(eq(recipeTags.recipeId, recipes.id), eq(recipes.isPublished, true)))
		.orderBy(asc(tags.name));
}

// ─── Get single recipe with all relations ────────────────────────────────────

export async function getRecipeById(id: string): Promise<RecipeFull | null> {
	const [row] = await db
		.select({
			id: recipes.id,
			authorId: recipes.authorId,
			authorName: user.name,
			title: recipes.title,
			description: recipes.description,
			imageUrl: recipes.imageUrl,
			isPublished: recipes.isPublished,
			createdAt: recipes.createdAt,
			updatedAt: recipes.updatedAt
		})
		.from(recipes)
		.leftJoin(user, eq(recipes.authorId, user.id))
		.where(eq(recipes.id, id));

	if (!row) return null;

	const [recipeIngredients, recipeSteps, recipeTagRows] = await Promise.all([
		db
			.select({
				id: ingredients.id,
				name: ingredients.name,
				quantity: ingredients.quantity,
				unit: ingredients.unit,
				sortOrder: ingredients.sortOrder
			})
			.from(ingredients)
			.where(eq(ingredients.recipeId, id))
			.orderBy(asc(ingredients.sortOrder)),
		db
			.select({
				id: steps.id,
				stepNumber: steps.stepNumber,
				instruction: steps.instruction,
				imageUrl: steps.imageUrl
			})
			.from(steps)
			.where(eq(steps.recipeId, id))
			.orderBy(asc(steps.stepNumber)),
		db
			.select({ id: tags.id, name: tags.name })
			.from(recipeTags)
			.innerJoin(tags, eq(recipeTags.tagId, tags.id))
			.where(eq(recipeTags.recipeId, id))
	]);

	return {
		...row,
		authorName: row.authorName ?? 'Unknown',
		ingredients: recipeIngredients,
		steps: recipeSteps,
		tags: recipeTagRows
	} as RecipeFull;
}

// ─── List user's own recipes ──────────────────────────────────────────────────

export async function listMyRecipes(authorId: string) {
	return db
		.select({
			id: recipes.id,
			title: recipes.title,
			imageUrl: recipes.imageUrl,
			isPublished: recipes.isPublished,
			createdAt: recipes.createdAt
		})
		.from(recipes)
		.where(eq(recipes.authorId, authorId))
		.orderBy(desc(recipes.createdAt));
}

// ─── Create recipe ────────────────────────────────────────────────────────────

export async function createRecipe(authorId: string, input: RecipeInput) {
	const tagIds = await upsertTags(input.tagNames);

	const [recipe] = await db
		.insert(recipes)
		.values({
			authorId,
			title: input.title,
			description: input.description ?? null,
			imageUrl: input.imageUrl ?? null,
			isPublished: input.isPublished ?? false
		})
		.returning();

	if (input.ingredients.length > 0) {
		await db.insert(ingredients).values(
			input.ingredients.map((ing, i) => ({
				recipeId: recipe.id,
				name: ing.name,
				quantity: ing.quantity,
				unit: ing.unit ?? null,
				sortOrder: i
			}))
		);
	}

	if (input.steps.length > 0) {
		await db.insert(steps).values(
			input.steps.map((s, i) => ({
				recipeId: recipe.id,
				stepNumber: i + 1,
				instruction: s.instruction
			}))
		);
	}

	if (tagIds.length > 0) {
		await db
			.insert(recipeTags)
			.values(tagIds.map((tagId) => ({ recipeId: recipe.id, tagId })));
	}

	return recipe;
}

// ─── Update recipe ────────────────────────────────────────────────────────────

export async function updateRecipe(
	id: string,
	authorId: string,
	input: RecipeInput,
	newImageUrl?: string | null
) {
	const [existing] = await db
		.select({ id: recipes.id, imageUrl: recipes.imageUrl })
		.from(recipes)
		.where(and(eq(recipes.id, id), eq(recipes.authorId, authorId)));

	if (!existing) return null;

	const tagIds = await upsertTags(input.tagNames);
	const imageUrlToSet = newImageUrl !== undefined ? newImageUrl : (input.imageUrl ?? null);

	const [updated] = await db
		.update(recipes)
		.set({
			title: input.title,
			description: input.description ?? null,
			imageUrl: imageUrlToSet,
			isPublished: input.isPublished ?? false,
			updatedAt: new Date()
		})
		.where(eq(recipes.id, id))
		.returning();

	await db.delete(ingredients).where(eq(ingredients.recipeId, id));
	if (input.ingredients.length > 0) {
		await db.insert(ingredients).values(
			input.ingredients.map((ing, i) => ({
				recipeId: id,
				name: ing.name,
				quantity: ing.quantity,
				unit: ing.unit ?? null,
				sortOrder: i
			}))
		);
	}

	await db.delete(steps).where(eq(steps.recipeId, id));
	if (input.steps.length > 0) {
		await db.insert(steps).values(
			input.steps.map((s, i) => ({
				recipeId: id,
				stepNumber: i + 1,
				instruction: s.instruction
			}))
		);
	}

	await db.delete(recipeTags).where(eq(recipeTags.recipeId, id));
	if (tagIds.length > 0) {
		await db
			.insert(recipeTags)
			.values(tagIds.map((tagId) => ({ recipeId: id, tagId })));
	}

	return { ...updated, oldImageUrl: existing.imageUrl };
}

// ─── Delete recipe ────────────────────────────────────────────────────────────

export async function deleteRecipe(id: string, authorId: string) {
	const [deleted] = await db
		.delete(recipes)
		.where(and(eq(recipes.id, id), eq(recipes.authorId, authorId)))
		.returning({ id: recipes.id, imageUrl: recipes.imageUrl });
	return deleted ?? null;
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export async function saveRecipe(userId: string, recipeId: string): Promise<void> {
	await db
		.insert(savedRecipes)
		.values({ userId, recipeId })
		.onConflictDoNothing();
}

export async function unsaveRecipe(userId: string, recipeId: string): Promise<void> {
	await db
		.delete(savedRecipes)
		.where(and(eq(savedRecipes.userId, userId), eq(savedRecipes.recipeId, recipeId)));
}

export async function isRecipeSaved(userId: string, recipeId: string): Promise<boolean> {
	const [row] = await db
		.select({ userId: savedRecipes.userId })
		.from(savedRecipes)
		.where(and(eq(savedRecipes.userId, userId), eq(savedRecipes.recipeId, recipeId)));
	return !!row;
}

export async function listSavedRecipes(userId: string): Promise<RecipeSummary[]> {
	const rows = await db
		.select({
			id: recipes.id,
			authorId: recipes.authorId,
			authorName: user.name,
			title: recipes.title,
			description: recipes.description,
			imageUrl: recipes.imageUrl,
			isPublished: recipes.isPublished,
			createdAt: recipes.createdAt
		})
		.from(savedRecipes)
		.innerJoin(recipes, eq(savedRecipes.recipeId, recipes.id))
		.leftJoin(user, eq(recipes.authorId, user.id))
		.where(and(eq(savedRecipes.userId, userId), eq(recipes.isPublished, true)))
		.orderBy(desc(savedRecipes.savedAt));
	return rows.map((r) => ({ ...r, authorName: r.authorName ?? 'Unknown' })) as RecipeSummary[];
}
