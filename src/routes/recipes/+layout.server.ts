import type { LayoutServerLoad } from './$types';

// No auth redirect — recipe listing and detail pages are public.
// Pass user (if any) so the layout can show conditional nav.
export const load: LayoutServerLoad = (event) => {
	return { user: event.locals.user ?? null };
};
