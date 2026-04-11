import {
	pgTable,
	uuid,
	text,
	boolean,
	integer,
	timestamp,
	primaryKey,
	index,
	customType
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

// Custom tsvector type for full-text search
const tsvector = customType<{ data: string }>({
	dataType() {
		return 'tsvector';
	}
});

// ─── Recipes ─────────────────────────────────────────────────────────────────
// better-auth manages the `user` table (see auth.schema.ts).
// authorId references user.id (text) as defined by better-auth.

export const recipes = pgTable(
	'recipes',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		imageUrl: text('image_url'),
		prepTime: integer('prep_time'), // minutes
		cookTime: integer('cook_time'), // minutes
		servings: integer('servings'),
		difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }),
		isPublished: boolean('is_published').notNull().default(false),
		// Populated via database trigger (see migration)
		searchVector: tsvector('search_vector'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('recipes_author_id_idx').on(table.authorId),
		index('recipes_created_at_idx').on(table.createdAt)
		// GIN index on search_vector is added via raw SQL in the migration
	]
);

// ─── Ingredients ─────────────────────────────────────────────────────────────

export const ingredients = pgTable('ingredients', {
	id: uuid('id').primaryKey().defaultRandom(),
	recipeId: uuid('recipe_id')
		.notNull()
		.references(() => recipes.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	quantity: text('quantity').notNull(),
	unit: text('unit'),
	sortOrder: integer('sort_order').notNull().default(0)
});

// ─── Steps ───────────────────────────────────────────────────────────────────

export const steps = pgTable('steps', {
	id: uuid('id').primaryKey().defaultRandom(),
	recipeId: uuid('recipe_id')
		.notNull()
		.references(() => recipes.id, { onDelete: 'cascade' }),
	stepNumber: integer('step_number').notNull(),
	instruction: text('instruction').notNull(),
	imageUrl: text('image_url')
});

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const tags = pgTable('tags', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').unique().notNull()
});

export const recipeTags = pgTable(
	'recipe_tags',
	{
		recipeId: uuid('recipe_id')
			.notNull()
			.references(() => recipes.id, { onDelete: 'cascade' }),
		tagId: uuid('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.recipeId, table.tagId] }),
		index('recipe_tags_tag_id_idx').on(table.tagId)
	]
);

// ─── Saved Recipes (bookmarks) ───────────────────────────────────────────────

export const savedRecipes = pgTable(
	'saved_recipes',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		recipeId: uuid('recipe_id')
			.notNull()
			.references(() => recipes.id, { onDelete: 'cascade' }),
		savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [primaryKey({ columns: [table.userId, table.recipeId] })]
);

// Re-export auth schema tables (managed by better-auth)
export * from './auth.schema';
