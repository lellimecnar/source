/**
 * JSON Patch (RFC 6902) Comparative Benchmarks
 *
 * Compares performance of JSON Patch implementations:
 * - @data-map (via adapter)
 * - fast-json-patch
 * - rfc6902
 * - immutable-json-patch
 */
import { bench, describe } from 'vitest';

import type { JsonPatchOperation } from './adapters';
import { JSONPATCH_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

// ============================================================================
// Test Data
// ============================================================================

const SMALL_DOC = {
	name: 'John Doe',
	age: 30,
	address: {
		street: '123 Main St',
		city: 'Springfield',
		zip: '12345',
	},
	tags: ['developer', 'javascript'],
};

const MEDIUM_DOC = {
	users: Array.from({ length: 100 }, (_, i) => ({
		id: i,
		name: `User ${i}`,
		email: `user${i}@example.com`,
		profile: {
			bio: `Bio for user ${i}`,
			avatar: `avatar${i}.png`,
			settings: {
				theme: i % 2 === 0 ? 'dark' : 'light',
				notifications: true,
			},
		},
	})),
	metadata: {
		version: '1.0.0',
		created: '2024-01-01',
		updated: '2024-06-15',
	},
};

const LARGE_DOC = {
	items: Array.from({ length: 1000 }, (_, i) => ({
		id: i,
		data: {
			nested: {
				value: i * 2,
				label: `Item ${i}`,
			},
		},
	})),
};

// ============================================================================
// Patch Operations
// ============================================================================

const SIMPLE_PATCHES: JsonPatchOperation[] = [
	{ op: 'replace', path: '/name', value: 'Jane Doe' },
	{ op: 'replace', path: '/age', value: 31 },
];

const ADD_PATCHES: JsonPatchOperation[] = [
	{ op: 'add', path: '/newField', value: 'new value' },
	{ op: 'add', path: '/address/country', value: 'USA' },
	{ op: 'add', path: '/tags/-', value: 'typescript' },
];

const REMOVE_PATCHES: JsonPatchOperation[] = [
	{ op: 'remove', path: '/tags/0' },
];

const DEEP_PATCHES: JsonPatchOperation[] = [
	{ op: 'replace', path: '/address/street', value: '456 Oak Ave' },
	{ op: 'replace', path: '/address/city', value: 'Portland' },
	{ op: 'replace', path: '/address/zip', value: '97201' },
];

const MIXED_PATCHES: JsonPatchOperation[] = [
	{ op: 'replace', path: '/name', value: 'Updated Name' },
	{ op: 'add', path: '/email', value: 'test@example.com' },
	{ op: 'remove', path: '/tags/1' },
	{ op: 'add', path: '/active', value: true },
];

const MEDIUM_DOC_PATCHES: JsonPatchOperation[] = [
	{ op: 'replace', path: '/users/50/name', value: 'Updated User' },
	{ op: 'replace', path: '/users/50/profile/bio', value: 'Updated bio' },
	{ op: 'add', path: '/metadata/lastModified', value: '2024-12-01' },
];

const LARGE_DOC_PATCHES: JsonPatchOperation[] = [
	{ op: 'replace', path: '/items/500/data/nested/value', value: 9999 },
	{ op: 'replace', path: '/items/999/data/nested/label', value: 'Modified' },
];

const BATCH_PATCHES: JsonPatchOperation[] = Array.from(
	{ length: 100 },
	(_, i) => ({
		op: 'replace' as const,
		path: `/users/${i}/profile/settings/theme`,
		value: 'updated',
	}),
);

// ============================================================================
// Benchmarks
// ============================================================================

describe('JSON Patch / Comparative', () => {
	for (const adapter of JSONPATCH_ADAPTERS) {
		// Smoke test
		bench(
			benchKey({
				category: 'jsonpatch',
				caseName: 'smoke',
				adapterName: adapter.name,
			}),
			() => {
				if (!adapter.smokeTest())
					throw new Error(`Smoke test failed: ${adapter.name}`);
			},
		);

		// Simple replacements (small doc)
		bench(
			benchKey({
				category: 'jsonpatch',
				caseName: 'simpleReplace2',
				adapterName: adapter.name,
			}),
			() => {
				adapter.applyPatch(structuredClone(SMALL_DOC), SIMPLE_PATCHES);
			},
		);

		// Add operations
		bench(
			benchKey({
				category: 'jsonpatch',
				caseName: 'addOps3',
				adapterName: adapter.name,
			}),
			() => {
				adapter.applyPatch(structuredClone(SMALL_DOC), ADD_PATCHES);
			},
		);

		// Remove operations
		bench(
			benchKey({
				category: 'jsonpatch',
				caseName: 'removeOp1',
				adapterName: adapter.name,
			}),
			() => {
				adapter.applyPatch(structuredClone(SMALL_DOC), REMOVE_PATCHES);
			},
		);

		// Deep nested updates
		bench(
			benchKey({
				category: 'jsonpatch',
				caseName: 'deepPatch3',
				adapterName: adapter.name,
			}),
			() => {
				adapter.applyPatch(structuredClone(SMALL_DOC), DEEP_PATCHES);
			},
		);

		// Mixed operations
		bench(
			benchKey({
				category: 'jsonpatch',
				caseName: 'mixedOps4',
				adapterName: adapter.name,
			}),
			() => {
				adapter.applyPatch(structuredClone(SMALL_DOC), MIXED_PATCHES);
			},
		);

		// Medium document patches
		bench(
			benchKey({
				category: 'jsonpatch',
				caseName: 'mediumDoc3',
				adapterName: adapter.name,
			}),
			() => {
				adapter.applyPatch(structuredClone(MEDIUM_DOC), MEDIUM_DOC_PATCHES);
			},
		);

		// Large document patches
		bench(
			benchKey({
				category: 'jsonpatch',
				caseName: 'largeDoc2',
				adapterName: adapter.name,
			}),
			() => {
				adapter.applyPatch(structuredClone(LARGE_DOC), LARGE_DOC_PATCHES);
			},
		);

		// Batch patches (100 operations on medium doc)
		bench(
			benchKey({
				category: 'jsonpatch',
				caseName: 'batch100',
				adapterName: adapter.name,
			}),
			() => {
				adapter.applyPatch(structuredClone(MEDIUM_DOC), BATCH_PATCHES);
			},
		);
	}
});

describe('JSON Patch / Generate Patch', () => {
	const from = { a: 1, b: 2, c: { d: 3 } };
	const to = { a: 99, b: 2, c: { d: 4 }, e: 5 };

	for (const adapter of JSONPATCH_ADAPTERS) {
		if (adapter.generatePatch) {
			bench(
				benchKey({
					category: 'jsonpatch',
					caseName: 'generateSimple',
					adapterName: adapter.name,
				}),
				() => {
					adapter.generatePatch?.(from, to);
				},
			);
		}
	}
});

describe('JSON Patch / Move and Copy', () => {
	const doc = {
		source: { value: 42 },
		target: {},
	};

	const moveOps: JsonPatchOperation[] = [
		{ op: 'move', from: '/source/value', path: '/moved' },
	];

	const copyOps: JsonPatchOperation[] = [
		{ op: 'copy', from: '/source/value', path: '/copied' },
	];

	for (const adapter of JSONPATCH_ADAPTERS) {
		if (adapter.features.supportsMoveAndCopy === true) {
			bench(
				benchKey({
					category: 'jsonpatch',
					caseName: 'moveOp',
					adapterName: adapter.name,
				}),
				() => {
					adapter.applyPatch(structuredClone(doc), moveOps);
				},
			);

			bench(
				benchKey({
					category: 'jsonpatch',
					caseName: 'copyOp',
					adapterName: adapter.name,
				}),
				() => {
					adapter.applyPatch(structuredClone(doc), copyOps);
				},
			);
		}
	}
});

describe('JSON Patch / Test Operations', () => {
	const doc = { a: 1, b: { c: 'hello' } };

	const testOps: JsonPatchOperation[] = [
		{ op: 'test', path: '/a', value: 1 },
		{ op: 'replace', path: '/a', value: 2 },
	];

	for (const adapter of JSONPATCH_ADAPTERS) {
		if (adapter.features.supportsTest === true) {
			bench(
				benchKey({
					category: 'jsonpatch',
					caseName: 'testThenReplace',
					adapterName: adapter.name,
				}),
				() => {
					adapter.applyPatch(structuredClone(doc), testOps);
				},
			);
		}
	}
});
