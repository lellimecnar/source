export type FixtureScale =
	| 'tiny'
	| 'small'
	| 'medium'
	| 'large'
	| 'xlarge'
	| 'massive';

export interface GeneratorSeeded {
	seed: number;
}

export type WideObjectOptions = GeneratorSeeded & {
	width: number;
	depth: number;
};

export type DeepObjectOptions = GeneratorSeeded & {
	depth: number;
};

export type WideArrayOptions = GeneratorSeeded & {
	length: number;
};

export type NestedArrayOptions = GeneratorSeeded & {
	length: number;
	nestingDepth: number;
	itemsPerLevel: number;
};

export type StringHeavyOptions = GeneratorSeeded & {
	count: number;
	stringLength: number;
};

export type SparseArrayOptions = GeneratorSeeded & {
	length: number;
	density: number; // 0-1, percentage of filled slots
};

export type RealisticDataOptions = GeneratorSeeded & {
	userCount: number;
	postsPerUser: number;
	commentsPerPost: number;
};

export interface DatasetCatalog {
	// Size variants
	tinyObject: Record<string, unknown>;
	smallObject: Record<string, unknown>;
	mediumObject: Record<string, unknown>;
	largeObject: Record<string, unknown>;
	xlargeObject: Record<string, unknown>;

	// Structure variants
	deepObject: Record<string, unknown>;
	veryDeepObject: Record<string, unknown>;
	wideArray: unknown[];
	largeArray: unknown[];
	massiveArray: unknown[];
	nestedArrays: unknown[];
	sparseArray: unknown[];

	// Content variants
	stringHeavy: Record<string, unknown>;
	numberHeavy: Record<string, unknown>;
	mixed: Record<string, unknown>;

	// Realistic data
	userStore: Record<string, unknown>;
	todoApp: Record<string, unknown>;
	ecommerce: Record<string, unknown>;
}

export interface BenchmarkDataset {
	name: string;
	description: string;
	data: unknown;
	/** Approximate byte size */
	size: number;
	/** Number of nodes/properties */
	nodeCount: number;
	/** Maximum depth */
	maxDepth: number;
	/** Sample paths for benchmarking */
	samplePaths: {
		shallow: string;
		deep: string;
		array: string;
		missing: string;
	};
}
