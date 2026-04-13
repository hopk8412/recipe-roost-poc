import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { logger } from '$lib/server/logger';
import type { Actions, PageServerLoad } from './$types';

const registerSchema = z
	.object({
		name: z.string().min(2, { error: 'Name must be at least 2 characters' }),
		email: z.string().check(z.email({ error: 'Please enter a valid email address' })),
		password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
		confirmPassword: z.string()
	})
	.refine((data) => data.password === data.confirmPassword, {
		error: "Passwords don't match",
		path: ['confirmPassword']
	});

export const load: PageServerLoad = async () => {
	return { form: await superValidate(zod4(registerSchema)) };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod4(registerSchema));
		if (!form.valid) return fail(400, { form });

		try {
			await auth.api.signUpEmail({
				body: {
					name: form.data.name,
					email: form.data.email,
					password: form.data.password
				}
			});
		} catch (error) {
			if (error instanceof APIError) {
				return message(form, error.message || 'Registration failed. Please try again.', {
					status: 400
				});
			}
			logger.error({ err: error }, 'Unexpected error during registration');
			return message(form, 'An unexpected error occurred. Please try again.', { status: 500 });
		}

		return redirect(302, '/dashboard');
	}
};
