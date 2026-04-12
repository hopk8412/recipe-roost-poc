import { db } from '$lib/server/db';
import { user, userRoles } from '$lib/server/db/schema';
import { desc, and, eq, count, sql } from 'drizzle-orm';

export type UserWithRole = {
	id: string;
	name: string;
	email: string;
	createdAt: Date;
	isAdmin: boolean;
};

export async function listUsersWithRoles(page = 1, limit = 20) {
	const offset = (page - 1) * limit;

	const [rows, countRows] = await Promise.all([
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				createdAt: user.createdAt,
				isAdmin: sql<boolean>`${userRoles.role} IS NOT NULL`
			})
			.from(user)
			.leftJoin(userRoles, and(eq(userRoles.userId, user.id), eq(userRoles.role, 'admin')))
			.orderBy(desc(user.createdAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(user)
	]);

	const total = countRows[0]?.total ?? 0;

	return {
		users: rows as UserWithRole[],
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit)
	};
}
