import { redirect, error } from '@sveltejs/kit';
import { deleteRecipe } from '$lib/server/db/queries/recipes';
import { deleteImageByUrl } from '$lib/server/storage';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const deleted = await deleteRecipe(event.params.id, event.locals.user!.id, event.locals.isAdmin);

		if (!deleted) {
			error(403, 'Forbidden');
		}

		if (deleted.imageUrl) {
			await deleteImageByUrl(deleted.imageUrl);
		}

		return redirect(302, '/dashboard');
	}
};
