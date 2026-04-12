import { listPublishedRecipes, listAllTags } from '$lib/server/db/queries/recipes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const q = url.searchParams.get('q')?.trim() || undefined;
	const tag = url.searchParams.get('tag') || undefined;

	const [listing, allTags] = await Promise.all([
		listPublishedRecipes(page, 12, { q, tag }),
		listAllTags()
	]);

	// Public recipe listing is the same for all users — allow CDN/proxy caching.
	// Use a short TTL so newly published recipes appear quickly.
	setHeaders({ 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });

	return {
		recipes: listing.recipes,
		total: listing.total,
		page: listing.page,
		limit: listing.limit,
		totalPages: listing.totalPages,
		allTags,
		q: q ?? null,
		tag: tag ?? null
	};
};
