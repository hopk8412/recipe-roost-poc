import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';

const loginSchema = z.object({
	email: z.string().check(z.email({ error: 'Please enter a valid email address' })),
	password: z.string().min(8, { error: 'Password must be at least 8 characters' })
});

export const load: PageServerLoad = async () => {
	return { form: await superValidate(zod4(loginSchema)) };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod4(loginSchema));
		if (!form.valid) return fail(400, { form });

		try {
			await auth.api.signInEmail({
				body: { email: form.data.email, password: form.data.password }
			});
		} catch (error) {
			if (error instanceof APIError) {
				return message(form, error.message || 'Invalid email or password', { status: 400 });
			}
			return message(form, 'An unexpected error occurred. Please try again.', { status: 500 });
		}

		return redirect(302, '/dashboard');
	}
};
