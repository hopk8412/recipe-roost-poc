import { fail, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userRoles } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { listUsersWithRoles } from '$lib/server/db/queries/users';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	return listUsersWithRoles(page, PAGE_SIZE);
};

export const actions: Actions = {
	grantAdmin: async ({ request, locals }) => {
		const formData = await request.formData();
		const targetUserId = formData.get('userId');

		if (typeof targetUserId !== 'string' || !targetUserId) {
			return fail(400, { error: 'Missing userId' });
		}

		await db
			.insert(userRoles)
			.values({ userId: targetUserId, role: 'admin' })
			.onConflictDoNothing();

		return { success: true };
	},

	revokeAdmin: async ({ request, locals }) => {
		const formData = await request.formData();
		const targetUserId = formData.get('userId');

		if (typeof targetUserId !== 'string' || !targetUserId) {
			return fail(400, { error: 'Missing userId' });
		}

		// Prevent an admin from removing their own role
		if (targetUserId === locals.user!.id) {
			return fail(403, { error: 'You cannot revoke your own admin role.' });
		}

		await db
			.delete(userRoles)
			.where(and(eq(userRoles.userId, targetUserId), eq(userRoles.role, 'admin')));

		return { success: true };
	}
};
