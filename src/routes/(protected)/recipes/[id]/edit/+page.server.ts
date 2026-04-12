import { fail, redirect, error } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { getRecipeById, updateRecipe } from '$lib/server/db/queries/recipes';
import { uploadImage, deleteImageByUrl } from '$lib/server/storage';
import {
	recipeFormSchema,
	ingredientRowSchema,
	stepRowSchema,
	parseTagNames
} from '$lib/recipe-form';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const recipe = await getRecipeById(event.params.id);
	if (!recipe) error(404, 'Recipe not found');
	if (recipe.authorId !== event.locals.user!.id && !event.locals.isAdmin) error(403, 'Forbidden');

	return {
		recipe,
		form: await superValidate(
			{
				title: recipe.title,
				description: recipe.description ?? '',
				isPublished: recipe.isPublished,
				tags: recipe.tags.map((t) => t.name).join(', '),
				ingredientsJson: JSON.stringify(
					recipe.ingredients.map((i) => ({
						name: i.name,
						quantity: i.quantity,
						unit: i.unit ?? ''
					}))
				),
				stepsJson: JSON.stringify(recipe.steps.map((s) => ({ instruction: s.instruction })))
			},
			zod4(recipeFormSchema)
		)
	};
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
		let newImageUrl: string | undefined;
		if (imageFile && imageFile.size > 0) {
			try {
				newImageUrl = await uploadImage(imageFile);
			} catch {
				return message(form, 'Image upload failed — please try again.', { status: 500 });
			}
		}

		const result = await updateRecipe(
			event.params.id,
			event.locals.user!.id,
			{
				title: form.data.title,
				description: form.data.description || null,
				isPublished: form.data.isPublished,
				ingredients: parsedIngredients,
				steps: parsedSteps,
				tagNames: parseTagNames(form.data.tags)
			},
			newImageUrl,
			event.locals.isAdmin
		);

		if (!result) error(403, 'Forbidden');

		// Delete old image if replaced with a new one
		if (newImageUrl && result.oldImageUrl) {
			await deleteImageByUrl(result.oldImageUrl);
		}

		return redirect(302, `/recipes/${event.params.id}`);
	}
};
