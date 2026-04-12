/**
 * Database seed script — populates the database with sample users and recipes
 * for local development and demos.
 *
 * Run with:  npm run db:seed
 *
 * Safe to run multiple times: uses upsert-style inserts that skip conflicts.
 */

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { user } from './auth.schema';

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL or DATABASE_URL_DIRECT is not set');

const client = postgres(url, { prepare: false });
const db = drizzle(client, { schema });

// ─── Sample data ─────────────────────────────────────────────────────────────

const SEED_USERS = [
	{
		id: 'seed-user-alice',
		name: 'Alice Baker',
		email: 'alice@example.com',
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date()
	},
	{
		id: 'seed-user-bob',
		name: 'Bob Chef',
		email: 'bob@example.com',
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date()
	}
];

const SEED_TAGS = ['breakfast', 'lunch', 'dinner', 'vegetarian', 'quick', 'comfort-food', 'baking'];

const SEED_RECIPES = [
	{
		authorId: 'seed-user-alice',
		title: 'Classic Pancakes',
		description: 'Fluffy, golden pancakes perfect for a lazy weekend morning.',
		isPublished: true,
		tags: ['breakfast', 'quick'],
		ingredients: [
			{ name: 'All-purpose flour', quantity: '1.5', unit: 'cups', sortOrder: 1 },
			{ name: 'Baking powder', quantity: '3.5', unit: 'tsp', sortOrder: 2 },
			{ name: 'Salt', quantity: '1', unit: 'tsp', sortOrder: 3 },
			{ name: 'White sugar', quantity: '1', unit: 'tbsp', sortOrder: 4 },
			{ name: 'Milk', quantity: '1.25', unit: 'cups', sortOrder: 5 },
			{ name: 'Egg', quantity: '1', unit: 'large', sortOrder: 6 },
			{ name: 'Melted butter', quantity: '3', unit: 'tbsp', sortOrder: 7 }
		],
		steps: [
			{ stepNumber: 1, instruction: 'Mix dry ingredients (flour, baking powder, salt, sugar) in a large bowl.' },
			{ stepNumber: 2, instruction: 'Whisk together milk, egg, and melted butter in a separate bowl.' },
			{ stepNumber: 3, instruction: 'Pour wet ingredients into dry ingredients and stir until just combined — lumps are fine.' },
			{ stepNumber: 4, instruction: 'Heat a lightly oiled griddle over medium-high heat.' },
			{ stepNumber: 5, instruction: 'Pour about ¼ cup batter per pancake. Cook until bubbles form on the surface, then flip.' },
			{ stepNumber: 6, instruction: 'Cook for another minute until golden. Serve with maple syrup.' }
		]
	},
	{
		authorId: 'seed-user-alice',
		title: 'Roasted Tomato Soup',
		description: 'Rich and velvety tomato soup made with oven-roasted tomatoes and fresh basil.',
		isPublished: true,
		tags: ['lunch', 'dinner', 'vegetarian', 'comfort-food'],
		ingredients: [
			{ name: 'Roma tomatoes', quantity: '1', unit: 'kg', sortOrder: 1 },
			{ name: 'Olive oil', quantity: '3', unit: 'tbsp', sortOrder: 2 },
			{ name: 'Garlic cloves', quantity: '4', unit: '', sortOrder: 3 },
			{ name: 'Yellow onion', quantity: '1', unit: 'large', sortOrder: 4 },
			{ name: 'Vegetable broth', quantity: '500', unit: 'ml', sortOrder: 5 },
			{ name: 'Fresh basil leaves', quantity: '0.5', unit: 'cup', sortOrder: 6 },
			{ name: 'Heavy cream', quantity: '60', unit: 'ml', sortOrder: 7 },
			{ name: 'Salt and pepper', quantity: '', unit: 'to taste', sortOrder: 8 }
		],
		steps: [
			{ stepNumber: 1, instruction: 'Preheat oven to 200 °C (400 °F). Halve tomatoes, toss with 2 tbsp olive oil, salt, and pepper.' },
			{ stepNumber: 2, instruction: 'Roast tomatoes and whole garlic cloves on a baking sheet for 30 minutes until caramelised.' },
			{ stepNumber: 3, instruction: 'Sauté diced onion in remaining olive oil in a large pot over medium heat until soft, about 8 minutes.' },
			{ stepNumber: 4, instruction: 'Add roasted tomatoes, garlic, and vegetable broth to the pot. Simmer for 10 minutes.' },
			{ stepNumber: 5, instruction: 'Blend smooth with an immersion blender. Stir in basil and cream.' },
			{ stepNumber: 6, instruction: 'Season to taste and serve hot with crusty bread.' }
		]
	},
	{
		authorId: 'seed-user-bob',
		title: 'Sourdough Bread',
		description: 'A crusty, tangy sourdough loaf that takes time but rewards every minute.',
		isPublished: true,
		tags: ['baking', 'breakfast'],
		ingredients: [
			{ name: 'Bread flour', quantity: '450', unit: 'g', sortOrder: 1 },
			{ name: 'Water', quantity: '350', unit: 'ml', sortOrder: 2 },
			{ name: 'Active sourdough starter', quantity: '100', unit: 'g', sortOrder: 3 },
			{ name: 'Salt', quantity: '9', unit: 'g', sortOrder: 4 }
		],
		steps: [
			{ stepNumber: 1, instruction: 'Mix flour and water; rest 30 minutes (autolyse).' },
			{ stepNumber: 2, instruction: 'Add starter and salt; mix until incorporated.' },
			{ stepNumber: 3, instruction: 'Perform 4 sets of stretch-and-folds every 30 minutes over 2 hours.' },
			{ stepNumber: 4, instruction: 'Shape the dough and place in a floured banneton. Refrigerate overnight (8–12 hours).' },
			{ stepNumber: 5, instruction: 'Preheat oven to 250 °C with a Dutch oven inside for 45 minutes.' },
			{ stepNumber: 6, instruction: 'Score the dough, bake covered for 20 minutes, then uncovered for 25 minutes until deep brown.' },
			{ stepNumber: 7, instruction: 'Cool on a wire rack for at least 1 hour before slicing.' }
		]
	},
	{
		authorId: 'seed-user-bob',
		title: 'Quick Stir-Fried Noodles',
		description: 'Weeknight dinner ready in 20 minutes — savory noodles packed with vegetables.',
		isPublished: true,
		tags: ['dinner', 'quick'],
		ingredients: [
			{ name: 'Egg noodles', quantity: '200', unit: 'g', sortOrder: 1 },
			{ name: 'Soy sauce', quantity: '3', unit: 'tbsp', sortOrder: 2 },
			{ name: 'Sesame oil', quantity: '1', unit: 'tbsp', sortOrder: 3 },
			{ name: 'Garlic', quantity: '2', unit: 'cloves', sortOrder: 4 },
			{ name: 'Mixed vegetables (bell pepper, snap peas, carrot)', quantity: '200', unit: 'g', sortOrder: 5 },
			{ name: 'Spring onions', quantity: '2', unit: '', sortOrder: 6 },
			{ name: 'Vegetable oil', quantity: '2', unit: 'tbsp', sortOrder: 7 }
		],
		steps: [
			{ stepNumber: 1, instruction: 'Cook noodles per packet instructions; drain and toss with sesame oil.' },
			{ stepNumber: 2, instruction: 'Heat vegetable oil in a wok over high heat until smoking.' },
			{ stepNumber: 3, instruction: 'Stir-fry garlic for 30 seconds, then add vegetables; cook 2–3 minutes.' },
			{ stepNumber: 4, instruction: 'Add noodles and soy sauce; toss everything together for 2 minutes.' },
			{ stepNumber: 5, instruction: 'Garnish with spring onions and serve immediately.' }
		]
	},
	{
		authorId: 'seed-user-alice',
		title: 'Chocolate Chip Cookies',
		description: 'Chewy, golden-edged cookies with pools of melted chocolate — a timeless classic.',
		isPublished: true,
		tags: ['baking', 'comfort-food'],
		ingredients: [
			{ name: 'Unsalted butter (softened)', quantity: '225', unit: 'g', sortOrder: 1 },
			{ name: 'White sugar', quantity: '100', unit: 'g', sortOrder: 2 },
			{ name: 'Brown sugar', quantity: '165', unit: 'g', sortOrder: 3 },
			{ name: 'Eggs', quantity: '2', unit: 'large', sortOrder: 4 },
			{ name: 'Vanilla extract', quantity: '2', unit: 'tsp', sortOrder: 5 },
			{ name: 'All-purpose flour', quantity: '280', unit: 'g', sortOrder: 6 },
			{ name: 'Baking soda', quantity: '1', unit: 'tsp', sortOrder: 7 },
			{ name: 'Salt', quantity: '1', unit: 'tsp', sortOrder: 8 },
			{ name: 'Chocolate chips', quantity: '340', unit: 'g', sortOrder: 9 }
		],
		steps: [
			{ stepNumber: 1, instruction: 'Preheat oven to 190 °C (375 °F). Line baking sheets with parchment.' },
			{ stepNumber: 2, instruction: 'Beat butter and both sugars until light and fluffy, about 3 minutes.' },
			{ stepNumber: 3, instruction: 'Beat in eggs one at a time, then add vanilla.' },
			{ stepNumber: 4, instruction: 'Whisk together flour, baking soda, and salt; gradually mix into butter mixture.' },
			{ stepNumber: 5, instruction: 'Fold in chocolate chips.' },
			{ stepNumber: 6, instruction: 'Drop rounded tablespoons of dough 5 cm apart on the prepared sheets.' },
			{ stepNumber: 7, instruction: 'Bake 9–11 minutes until edges are golden but centres look slightly underdone.' },
			{ stepNumber: 8, instruction: 'Cool on the baking sheet for 5 minutes, then transfer to a wire rack.' }
		]
	}
];

// ─── Seeding logic ────────────────────────────────────────────────────────────

async function seed() {
	console.log('🌱 Seeding database…');

	// Users — skip if already exist
	for (const u of SEED_USERS) {
		const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, u.email));
		if (existing.length === 0) {
			await db.insert(user).values(u);
			console.log(`  ✔ Created user: ${u.email}`);
		} else {
			console.log(`  – Skipped existing user: ${u.email}`);
			// Use the real DB id for recipe inserts
			u.id = existing[0].id;
		}
	}

	// Tags
	const tagMap = new Map<string, string>(); // name → id
	for (const name of SEED_TAGS) {
		const existing = await db
			.select({ id: schema.tags.id, name: schema.tags.name })
			.from(schema.tags)
			.where(eq(schema.tags.name, name));
		if (existing.length === 0) {
			const [tag] = await db.insert(schema.tags).values({ name }).returning();
			tagMap.set(name, tag.id);
		} else {
			tagMap.set(name, existing[0].id);
		}
	}
	console.log(`  ✔ Tags ready (${SEED_TAGS.length})`);

	// Recipes
	for (const r of SEED_RECIPES) {
		// Resolve author id in case the upsert-skip above updated the id
		const author = SEED_USERS.find((u) => u.id === r.authorId || u.email.startsWith(r.authorId.replace('seed-user-', '').split('-')[0]));
		const authorId = author?.id ?? r.authorId;

		// Skip if a recipe with the same title already exists for this author
		const existing = await db
			.select({ id: schema.recipes.id })
			.from(schema.recipes)
			.where(eq(schema.recipes.title, r.title));
		if (existing.length > 0) {
			console.log(`  – Skipped existing recipe: "${r.title}"`);
			continue;
		}

		const [recipe] = await db
			.insert(schema.recipes)
			.values({
				authorId,
				title: r.title,
				description: r.description,
				isPublished: r.isPublished
			})
			.returning();

		// Ingredients
		await db.insert(schema.ingredients).values(
			r.ingredients.map((ing) => ({ ...ing, recipeId: recipe.id }))
		);

		// Steps
		await db.insert(schema.steps).values(
			r.steps.map((s) => ({ ...s, recipeId: recipe.id }))
		);

		// Tags
		for (const tagName of r.tags) {
			const tagId = tagMap.get(tagName);
			if (tagId) {
				await db
					.insert(schema.recipeTags)
					.values({ recipeId: recipe.id, tagId })
					.onConflictDoNothing();
			}
		}

		console.log(`  ✔ Created recipe: "${r.title}"`);
	}

	console.log('✅ Seed complete.');
	await client.end();
}

seed().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
