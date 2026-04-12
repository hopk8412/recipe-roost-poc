import { error, redirect } from '@sveltejs/kit';
import {
	getRecipeById,
	isRecipeSaved,
	saveRecipe,
	unsaveRecipe
} from '$lib/server/db/queries/recipes';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
	const recipe = await getRecipeById(event.params.id);

	if (!recipe) {
		error(404, 'Recipe not found');
	}

	// Unpublished recipes are only visible to their author
	if (!recipe.isPublished && recipe.authorId !== event.locals.user?.id) {
		error(404, 'Recipe not found');
	}

	const currentUserId = event.locals.user?.id ?? null;

	const isSaved =
		currentUserId && currentUserId !== recipe.authorId
			? await isRecipeSaved(currentUserId, recipe.id)
			: false;

	// Cache published recipe pages for unauthenticated visitors (CDN-friendly).
	// Authenticated users get personalised data (isSaved) so we skip caching.
	if (recipe.isPublished && !currentUserId) {
		event.setHeaders({ 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
	}

	return { recipe, currentUserId, isSaved };
};

export const actions: Actions = {
	save: async (event) => {
		if (!event.locals.user) redirect(302, '/login');
		await saveRecipe(event.locals.user.id, event.params.id);
		return { saved: true };
	},
	unsave: async (event) => {
		if (!event.locals.user) redirect(302, '/login');
		await unsaveRecipe(event.locals.user.id, event.params.id);
		return { saved: false };
	}
};
