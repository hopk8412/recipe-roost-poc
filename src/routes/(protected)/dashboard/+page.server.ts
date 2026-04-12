import { listMyRecipes, listSavedRecipes } from '$lib/server/db/queries/recipes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const userId = event.locals.user!.id;
	const [myRecipes, savedRecipes] = await Promise.all([
		listMyRecipes(userId),
		listSavedRecipes(userId)
	]);
	return { myRecipes, savedRecipes };
};
