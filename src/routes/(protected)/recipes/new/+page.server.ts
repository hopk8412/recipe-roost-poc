import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createRecipe } from '$lib/server/db/queries/recipes';
import { uploadImage } from '$lib/server/storage';
import {
	recipeFormSchema,
	ingredientRowSchema,
	stepRowSchema,
	parseTagNames
} from '$lib/recipe-form';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { form: await superValidate(zod4(recipeFormSchema)) };
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const form = await superValidate(formData, zod4(recipeFormSchema));
		if (!form.valid) return fail(400, { form });

		// Parse ingredients
		let parsedIngredients: { name: string; quantity: string; unit: string }[];
		try {
			parsedIngredients = ingredientRowSchema.parse(JSON.parse(form.data.ingredientsJson));
		} catch {
			return message(form, 'Please add at least one valid ingredient.', { status: 400 });
		}
		if (parsedIngredients.length === 0) {
			return message(form, 'Please add at least one ingredient.', { status: 400 });
		}

		// Parse steps
		let parsedSteps: { instruction: string }[];
		try {
			parsedSteps = stepRowSchema.parse(JSON.parse(form.data.stepsJson));
		} catch {
			return message(form, 'Please add at least one valid step.', { status: 400 });
		}
		if (parsedSteps.length === 0) {
			return message(form, 'Please add at least one step.', { status: 400 });
		}

		// Handle image upload
		const imageFile = formData.get('image') as File | null;
		let imageUrl: string | null = null;
		if (imageFile && imageFile.size > 0) {
			try {
				imageUrl = await uploadImage(imageFile);
			} catch {
				return message(form, 'Image upload failed — please try again.', { status: 500 });
			}
		}

		const recipe = await createRecipe(event.locals.user!.id, {
			title: form.data.title,
			description: form.data.description || null,
			imageUrl,
			isPublished: form.data.isPublished,
			ingredients: parsedIngredients,
			steps: parsedSteps,
			tagNames: parseTagNames(form.data.tags)
		});

		return redirect(302, `/recipes/${recipe.id}`);
	}
};
