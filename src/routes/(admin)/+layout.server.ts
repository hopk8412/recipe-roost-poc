import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => {
	if (!event.locals.user) {
		return redirect(302, '/login');
	}
	if (!event.locals.isAdmin) {
		return redirect(302, '/dashboard');
	}
	return { user: event.locals.user };
};
