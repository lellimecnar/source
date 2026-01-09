/**
 * Cloning Comparative Benchmarks
 *
 * Compares performance of deep cloning implementations:
 * - klona
 * - rfdc (Really Fast Deep Clone)
 * - structuredClone (native)
 */
import { bench, describe } from 'vitest';

import { CLONING_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

// ============================================================================
// Test Data - Various Sizes and Structures
// ============================================================================

// Small flat object
const SMALL_FLAT = {
	a: 1,
	b: 'hello',
	c: true,
	d: null,
	e: 3.14159,
};

// Small nested object
const SMALL_NESTED = {
	level1: {
		level2: {
			level3: {
				value: 'deep',
			},
		},
	},
};

// Medium flat object (100 keys)
const MEDIUM_FLAT = Object.fromEntries(
	Array.from({ length: 100 }, (_, i) => [`key${i}`, i]),
);

// Medium nested object
const MEDIUM_NESTED = {
	users: Array.from({ length: 50 }, (_, i) => ({
		id: i,
		name: `User ${i}`,
		profile: {
			bio: `Bio for user ${i}`,
			settings: {
				theme: 'dark',
				notifications: true,
			},
		},
	})),
};

// Large flat object (1000 keys)
const LARGE_FLAT = Object.fromEntries(
	Array.from({ length: 1000 }, (_, i) => [`key${i}`, i]),
);

// Large nested object
const LARGE_NESTED = {
	departments: Array.from({ length: 10 }, (_, deptId) => ({
		id: deptId,
		name: `Department ${deptId}`,
		employees: Array.from({ length: 100 }, (_, empId) => ({
			id: empId,
			name: `Employee ${empId}`,
			role: 'developer',
			metadata: {
				hired: '2024-01-01',
				level: empId % 5,
			},
		})),
	})),
};

// Very deep nesting (20 levels)
function createDeepNested(depth: number): object {
	let obj: object = { value: 'bottom' };
	for (let i = 0; i < depth; i++) {
		obj = { level: i, child: obj };
	}
	return obj;
}
const DEEP_NESTED = createDeepNested(20);

// Wide array
const WIDE_ARRAY = Array.from({ length: 10000 }, (_, i) => i);

// Array of objects
const ARRAY_OF_OBJECTS = Array.from({ length: 1000 }, (_, i) => ({
	id: i,
	value: `item-${i}`,
	nested: { x: i, y: i * 2 },
}));

// Mixed types
const MIXED_TYPES = {
	string: 'hello world',
	number: 42,
	float: 3.14159,
	boolean: true,
	null: null,
	array: [1, 2, 3, 4, 5],
	object: { a: 1, b: 2 },
	date: new Date('2024-01-01'),
	regexp: /test/gi,
	nested: {
		deep: {
			value: 'found',
		},
	},
};

// ============================================================================
// Benchmarks
// ============================================================================

describe('Cloning / Small Objects', () => {
	for (const adapter of CLONING_ADAPTERS) {
		bench(
			benchKey({
				category: 'cloning',
				caseName: 'smoke',
				adapterName: adapter.name,
			}),
			() => {
				if (!adapter.smokeTest())
					throw new Error(`Smoke test failed: ${adapter.name}`);
			},
		);

		bench(
			benchKey({
				category: 'cloning',
				caseName: 'smallFlat',
				adapterName: adapter.name,
			}),
			() => {
				adapter.clone(SMALL_FLAT);
			},
		);

		bench(
			benchKey({
				category: 'cloning',
				caseName: 'smallNested',
				adapterName: adapter.name,
			}),
			() => {
				adapter.clone(SMALL_NESTED);
			},
		);
	}
});

describe('Cloning / Medium Objects', () => {
	for (const adapter of CLONING_ADAPTERS) {
		bench(
			benchKey({
				category: 'cloning',
				caseName: 'mediumFlat100',
				adapterName: adapter.name,
			}),
			() => {
				adapter.clone(MEDIUM_FLAT);
			},
		);

		bench(
			benchKey({
				category: 'cloning',
				caseName: 'mediumNested50',
				adapterName: adapter.name,
			}),
			() => {
				adapter.clone(MEDIUM_NESTED);
			},
		);
	}
});

describe('Cloning / Large Objects', () => {
	for (const adapter of CLONING_ADAPTERS) {
		bench(
			benchKey({
				category: 'cloning',
				caseName: 'largeFlat1k',
				adapterName: adapter.name,
			}),
			() => {
				adapter.clone(LARGE_FLAT);
			},
		);

		bench(
			benchKey({
				category: 'cloning',
				caseName: 'largeNested1k',
				adapterName: adapter.name,
			}),
			() => {
				adapter.clone(LARGE_NESTED);
			},
		);
	}
});

describe('Cloning / Deep Nesting', () => {
	for (const adapter of CLONING_ADAPTERS) {
		bench(
			benchKey({
				category: 'cloning',
				caseName: 'deepNested20',
				adapterName: adapter.name,
			}),
			() => {
				adapter.clone(DEEP_NESTED);
			},
		);
	}
});

describe('Cloning / Arrays', () => {
	for (const adapter of CLONING_ADAPTERS) {
		bench(
			benchKey({
				category: 'cloning',
				caseName: 'wideArray10k',
				adapterName: adapter.name,
			}),
			() => {
				adapter.clone(WIDE_ARRAY);
			},
		);

		bench(
			benchKey({
				category: 'cloning',
				caseName: 'arrayOfObjects1k',
				adapterName: adapter.name,
			}),
			() => {
				adapter.clone(ARRAY_OF_OBJECTS);
			},
		);
	}
});

describe('Cloning / Mixed Types', () => {
	for (const adapter of CLONING_ADAPTERS) {
		bench(
			benchKey({
				category: 'cloning',
				caseName: 'mixedTypes',
				adapterName: adapter.name,
			}),
			() => {
				adapter.clone(MIXED_TYPES);
			},
		);
	}
});

describe('Cloning / Circular References', () => {
	// Only test adapters that handle circular references
	const circularObj: Record<string, unknown> = { a: 1, b: { c: 2 } };
	circularObj.self = circularObj;
	(circularObj.b as Record<string, unknown>).parent = circularObj;

	for (const adapter of CLONING_ADAPTERS) {
		if (adapter.features.handlesCircular === true) {
			bench(
				benchKey({
					category: 'cloning',
					caseName: 'circular',
					adapterName: adapter.name,
				}),
				() => {
					adapter.clone(circularObj);
				},
			);
		}
	}
});

describe('Cloning / Repeated Clones', () => {
	// Measure cloning the same object multiple times (cache behavior)
	for (const adapter of CLONING_ADAPTERS) {
		bench(
			benchKey({
				category: 'cloning',
				caseName: 'repeated100',
				adapterName: adapter.name,
			}),
			() => {
				for (let i = 0; i < 100; i++) {
					adapter.clone(MEDIUM_NESTED);
				}
			},
		);
	}
});
