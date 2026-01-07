import {
	generateDeepObject,
	generateEcommerce,
	generateMixedData,
	generateNestedArrays,
	generateNumberHeavyData,
	generateSparseArray,
	generateStringHeavyData,
	generateTodoApp,
	generateUserStore,
	generateWideArray,
	generateWideObject,
} from './generators.js';
import type { BenchmarkDataset, DatasetCatalog } from './types.js';

/**
 * Pre-generated datasets for benchmarking.
 * Each dataset is deterministically generated with a fixed seed for reproducibility.
 */
export const DATASETS: DatasetCatalog = {
	// Size variants (progressively larger)
	tinyObject: generateWideObject({ width: 3, depth: 1, seed: 0 }),
	smallObject: generateWideObject({ width: 10, depth: 2, seed: 1 }),
	mediumObject: generateWideObject({ width: 20, depth: 3, seed: 2 }),
	largeObject: generateWideObject({ width: 50, depth: 4, seed: 3 }),
	xlargeObject: generateWideObject({ width: 100, depth: 4, seed: 30 }),

	// Depth variants
	deepObject: generateDeepObject({ depth: 10, seed: 4 }),
	veryDeepObject: generateDeepObject({ depth: 50, seed: 40 }),

	// Array variants
	wideArray: generateWideArray({ length: 100, seed: 5 }),
	largeArray: generateWideArray({ length: 1000, seed: 50 }),
	massiveArray: generateWideArray({ length: 10000, seed: 500 }),
	nestedArrays: generateNestedArrays({
		length: 100,
		nestingDepth: 4,
		itemsPerLevel: 5,
		seed: 6,
	}),
	sparseArray: generateSparseArray({ length: 1000, density: 0.3, seed: 60 }),

	// Content variants
	stringHeavy: generateStringHeavyData({
		count: 100,
		stringLength: 500,
		seed: 8,
	}),
	numberHeavy: generateNumberHeavyData({ count: 1000, seed: 9 }),
	mixed: generateMixedData({ seed: 7 }),

	// Realistic application data
	userStore: generateUserStore({
		userCount: 100,
		postsPerUser: 5,
		commentsPerPost: 3,
		seed: 10,
	}),
	todoApp: generateTodoApp({ listCount: 10, todosPerList: 20, seed: 11 }),
	ecommerce: generateEcommerce({ productCount: 200, cartSize: 5, seed: 12 }),
};

/**
 * Curated benchmark datasets with metadata for reporting
 */
export const BENCHMARK_DATASETS: BenchmarkDataset[] = [
	{
		name: 'tiny',
		description: 'Minimal object (3 keys, depth 1)',
		data: DATASETS.tinyObject,
		size: JSON.stringify(DATASETS.tinyObject).length,
		nodeCount: 3,
		maxDepth: 1,
		samplePaths: {
			shallow: '/key0',
			deep: '/key0',
			array: '/key0',
			missing: '/nonexistent',
		},
	},
	{
		name: 'small',
		description: 'Small nested object (10 keys, depth 2)',
		data: DATASETS.smallObject,
		size: JSON.stringify(DATASETS.smallObject).length,
		nodeCount: 30,
		maxDepth: 2,
		samplePaths: {
			shallow: '/key0',
			deep: '/key5/key0',
			array: '/key0',
			missing: '/key0/nonexistent',
		},
	},
	{
		name: 'medium',
		description: 'Medium nested object (20 keys, depth 3)',
		data: DATASETS.mediumObject,
		size: JSON.stringify(DATASETS.mediumObject).length,
		nodeCount: 420,
		maxDepth: 3,
		samplePaths: {
			shallow: '/key0',
			deep: '/key10/key5/key0',
			array: '/key0',
			missing: '/key10/key5/nonexistent',
		},
	},
	{
		name: 'large',
		description: 'Large nested object (50 keys, depth 4)',
		data: DATASETS.largeObject,
		size: JSON.stringify(DATASETS.largeObject).length,
		nodeCount: 7812,
		maxDepth: 4,
		samplePaths: {
			shallow: '/key0',
			deep: '/key25/key12/key6/key0',
			array: '/key0',
			missing: '/key25/key12/nonexistent',
		},
	},
	{
		name: 'deep',
		description: 'Deeply nested object (depth 10)',
		data: DATASETS.deepObject,
		size: JSON.stringify(DATASETS.deepObject).length,
		nodeCount: 21,
		maxDepth: 10,
		samplePaths: {
			shallow: '/value',
			deep: '/nested/nested/nested/nested/nested/value',
			array: '/value',
			missing: '/nested/nonexistent',
		},
	},
	{
		name: 'veryDeep',
		description: 'Very deeply nested object (depth 50)',
		data: DATASETS.veryDeepObject,
		size: JSON.stringify(DATASETS.veryDeepObject).length,
		nodeCount: 101,
		maxDepth: 50,
		samplePaths: {
			shallow: '/value',
			deep: '/nested/nested/nested/nested/nested/nested/nested/nested/nested/nested/value',
			array: '/value',
			missing: '/nested/nested/nonexistent',
		},
	},
	{
		name: 'array-100',
		description: 'Array with 100 objects',
		data: { items: DATASETS.wideArray },
		size: JSON.stringify(DATASETS.wideArray).length,
		nodeCount: 300,
		maxDepth: 2,
		samplePaths: {
			shallow: '/items/0',
			deep: '/items/50/value',
			array: '/items/50',
			missing: '/items/999',
		},
	},
	{
		name: 'array-1k',
		description: 'Array with 1,000 objects',
		data: { items: DATASETS.largeArray },
		size: JSON.stringify(DATASETS.largeArray).length,
		nodeCount: 3000,
		maxDepth: 2,
		samplePaths: {
			shallow: '/items/0',
			deep: '/items/500/value',
			array: '/items/500',
			missing: '/items/9999',
		},
	},
	{
		name: 'array-10k',
		description: 'Array with 10,000 objects',
		data: { items: DATASETS.massiveArray },
		size: JSON.stringify(DATASETS.massiveArray).length,
		nodeCount: 30000,
		maxDepth: 2,
		samplePaths: {
			shallow: '/items/0',
			deep: '/items/5000/value',
			array: '/items/5000',
			missing: '/items/99999',
		},
	},
	{
		name: 'realistic-users',
		description: 'Realistic user store (100 users, 500 posts, 1500 comments)',
		data: DATASETS.userStore,
		size: JSON.stringify(DATASETS.userStore).length,
		nodeCount: 15000,
		maxDepth: 5,
		samplePaths: {
			shallow: '/users/user_0',
			deep: '/users/user_50/profile/settings/theme',
			array: '/users/user_50/postIds/0',
			missing: '/users/user_999',
		},
	},
	{
		name: 'realistic-todo',
		description: 'Todo app state (10 lists, 200 todos)',
		data: DATASETS.todoApp,
		size: JSON.stringify(DATASETS.todoApp).length,
		nodeCount: 2500,
		maxDepth: 4,
		samplePaths: {
			shallow: '/lists/0',
			deep: '/lists/5/todos/10/title',
			array: '/lists/5/todos/10',
			missing: '/lists/99',
		},
	},
	{
		name: 'realistic-ecommerce',
		description: 'E-commerce store (200 products, cart)',
		data: DATASETS.ecommerce,
		size: JSON.stringify(DATASETS.ecommerce).length,
		nodeCount: 8000,
		maxDepth: 4,
		samplePaths: {
			shallow: '/cart/0',
			deep: '/products/prod_100/variants/0/sku',
			array: '/cart/2',
			missing: '/products/prod_999',
		},
	},
];

/**
 * Get a dataset by name
 */
export function getDataset(name: string): BenchmarkDataset | undefined {
	return BENCHMARK_DATASETS.find((d) => d.name === name);
}

/**
 * Get datasets filtered by approximate size
 */
export function getDatasetsBySize(maxBytes: number): BenchmarkDataset[] {
	return BENCHMARK_DATASETS.filter((d) => d.size <= maxBytes);
}
