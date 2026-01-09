/**
 * Path Access Comparative Benchmarks
 *
 * Compares performance of path-based property access libraries:
 * - @data-map/core
 * - lodash (get/set)
 * - dot-prop
 * - dlv/dset
 * - object-path
 * - json-pointer
 */
import { bench, describe } from 'vitest';

import { PATH_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

// ============================================================================
// Test Data
// ============================================================================

const SMALL_OBJ: Record<string, unknown> = {
	a: { b: { c: { d: { e: 1 } } } },
	x: 'hello',
	y: 42,
};

const WIDE_OBJ: Record<string, unknown> = Object.fromEntries(
	Array.from({ length: 2000 }, (_, i) => [`k${i}`, i]),
);

const DEEP_OBJ: Record<string, unknown> = (function () {
	let obj: Record<string, unknown> = { value: 'bottom' };
	for (let i = 0; i < 20; i++) {
		obj = { [`level${i}`]: obj };
	}
	return obj;
})();

const ARRAY_OBJ = {
	items: Array.from({ length: 1000 }, (_, i) => ({
		id: i,
		data: { value: i * 2 },
	})),
};

const MIXED_OBJ = {
	users: [
		{ id: 1, profile: { name: 'Alice', settings: { theme: 'dark' } } },
		{ id: 2, profile: { name: 'Bob', settings: { theme: 'light' } } },
	],
	config: {
		app: {
			version: '1.0.0',
			features: ['a', 'b', 'c'],
		},
	},
};

const BASE: Record<string, unknown> = {
	a: { b: { c: { d: { e: 1 } } } },
	wide: WIDE_OBJ,
};

// ============================================================================
// Basic Get Operations
// ============================================================================

describe('Path / Get Operations', () => {
	for (const adapter of PATH_ADAPTERS) {
		bench(
			benchKey({
				category: 'path',
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
				category: 'path',
				caseName: 'shallowGet',
				adapterName: adapter.name,
			}),
			() => {
				adapter.get(SMALL_OBJ, 'a');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'deepGet5',
				adapterName: adapter.name,
			}),
			() => {
				adapter.get(SMALL_OBJ, 'a.b.c.d.e');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'wideGet',
				adapterName: adapter.name,
			}),
			() => {
				adapter.get(BASE, 'wide.k1999');
			},
		);
	}
});

// ============================================================================
// Set Operations
// ============================================================================

describe('Path / Set Operations', () => {
	for (const adapter of PATH_ADAPTERS) {
		bench(
			benchKey({
				category: 'path',
				caseName: 'shallowSet',
				adapterName: adapter.name,
			}),
			() => {
				const obj = structuredClone(SMALL_OBJ);
				adapter.set(obj, 'x', 'updated');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'deepSet5',
				adapterName: adapter.name,
			}),
			() => {
				const obj = structuredClone(SMALL_OBJ);
				adapter.set(obj, 'a.b.c.d.e', 999);
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'createPath',
				adapterName: adapter.name,
			}),
			() => {
				const obj: Record<string, unknown> = {};
				adapter.set(obj, 'new.nested.path', 'value');
			},
		);
	}
});

// ============================================================================
// Has/Exists Operations
// ============================================================================

describe('Path / Has Operations', () => {
	for (const adapter of PATH_ADAPTERS) {
		bench(
			benchKey({
				category: 'path',
				caseName: 'hasShallow',
				adapterName: adapter.name,
			}),
			() => {
				adapter.has(SMALL_OBJ, 'a');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'hasDeep',
				adapterName: adapter.name,
			}),
			() => {
				adapter.has(SMALL_OBJ, 'a.b.c.d.e');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'hasWide',
				adapterName: adapter.name,
			}),
			() => {
				adapter.has(BASE, 'wide.k1999');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'hasMissing',
				adapterName: adapter.name,
			}),
			() => {
				adapter.has(SMALL_OBJ, 'nonexistent.path');
			},
		);
	}
});

// ============================================================================
// Delete Operations
// ============================================================================

describe('Path / Delete Operations', () => {
	for (const adapter of PATH_ADAPTERS) {
		bench(
			benchKey({
				category: 'path',
				caseName: 'deleteShallow',
				adapterName: adapter.name,
			}),
			() => {
				const obj = structuredClone(SMALL_OBJ);
				adapter.del(obj, 'x');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'deleteDeep',
				adapterName: adapter.name,
			}),
			() => {
				const obj = structuredClone(SMALL_OBJ);
				adapter.del(obj, 'a.b.c.d');
			},
		);
	}
});

// ============================================================================
// Array Access
// ============================================================================

describe('Path / Array Access', () => {
	for (const adapter of PATH_ADAPTERS) {
		bench(
			benchKey({
				category: 'path',
				caseName: 'getArrayIndex',
				adapterName: adapter.name,
			}),
			() => {
				adapter.get(ARRAY_OBJ, 'items.500');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'getArrayNested',
				adapterName: adapter.name,
			}),
			() => {
				adapter.get(ARRAY_OBJ, 'items.500.data.value');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'setArrayIndex',
				adapterName: adapter.name,
			}),
			() => {
				const obj = structuredClone(ARRAY_OBJ);
				adapter.set(obj, 'items.500.data.value', 9999);
			},
		);
	}
});

// ============================================================================
// Deep Nesting (20 levels)
// ============================================================================

describe('Path / Deep Nesting', () => {
	const deepPath = Array.from({ length: 20 }, (_, i) => `level${19 - i}`).join(
		'.',
	);

	for (const adapter of PATH_ADAPTERS) {
		bench(
			benchKey({
				category: 'path',
				caseName: 'getDeep20',
				adapterName: adapter.name,
			}),
			() => {
				adapter.get(DEEP_OBJ, deepPath);
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'hasDeep20',
				adapterName: adapter.name,
			}),
			() => {
				adapter.has(DEEP_OBJ, deepPath);
			},
		);
	}
});

// ============================================================================
// Repeated Access (Cache Behavior)
// ============================================================================

describe('Path / Repeated Access', () => {
	for (const adapter of PATH_ADAPTERS) {
		bench(
			benchKey({
				category: 'path',
				caseName: 'repeatedGet100',
				adapterName: adapter.name,
			}),
			() => {
				for (let i = 0; i < 100; i++) {
					adapter.get(SMALL_OBJ, 'a.b.c.d.e');
				}
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'randomAccess100',
				adapterName: adapter.name,
			}),
			() => {
				for (let i = 0; i < 100; i++) {
					adapter.get(BASE, `wide.k${i * 20}`);
				}
			},
		);
	}
});

// ============================================================================
// Mixed Object Access
// ============================================================================

describe('Path / Mixed Object', () => {
	for (const adapter of PATH_ADAPTERS) {
		bench(
			benchKey({
				category: 'path',
				caseName: 'mixedArrayObject',
				adapterName: adapter.name,
			}),
			() => {
				adapter.get(MIXED_OBJ, 'users.0.profile.settings.theme');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'mixedSetArrayObject',
				adapterName: adapter.name,
			}),
			() => {
				const obj = structuredClone(MIXED_OBJ);
				adapter.set(obj, 'users.1.profile.settings.theme', 'custom');
			},
		);
	}
});
