import { createDataMap } from '@data-map/core';

import type { JsonPatchAdapter, JsonPatchOperation } from './types.js';

/**
 * Helper to get a nested value (object or primitive) from a DataMap.
 * DataMap uses flat storage so intermediate objects don't exist as keys.
 * We must reconstruct objects by collecting all keys with the given prefix.
 */
function getNestedValue(
	dm: ReturnType<typeof createDataMap>,
	path: string,
): unknown {
	// First try direct access for leaf values
	if (dm.has(path)) {
		return dm.get(path);
	}

	// If not a leaf, collect all descendant keys and reconstruct the object
	const prefix = path === '' ? '' : `${path}/`;
	const keys = dm.keys().filter((k) => k === path || k.startsWith(prefix));

	if (keys.length === 0) {
		return undefined;
	}

	// Reconstruct the object from flat keys
	const result: Record<string, unknown> = {};
	for (const key of keys) {
		const relativePath = key.slice(prefix.length);
		if (!relativePath) continue;

		const parts = relativePath.split('/');
		let current: Record<string, unknown> = result;

		for (let i = 0; i < parts.length - 1; i++) {
			if (!(parts[i] in current)) {
				current[parts[i]] = {};
			}
			current = current[parts[i]] as Record<string, unknown>;
		}

		current[parts[parts.length - 1]] = dm.get(key);
	}

	return result;
}

/**
 * Helper to set a nested value (object or primitive) to a DataMap.
 */
function setNestedValue(
	dm: ReturnType<typeof createDataMap>,
	path: string,
	value: unknown,
): void {
	if (value === null || typeof value !== 'object') {
		dm.set(path, value);
		return;
	}

	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			setNestedValue(dm, `${path}/${i}`, value[i]);
		}
	} else {
		for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
			setNestedValue(dm, `${path}/${key}`, val);
		}
	}
}

/**
 * Helper to delete a path and all descendants from a DataMap.
 */
function deleteNestedValue(
	dm: ReturnType<typeof createDataMap>,
	path: string,
): void {
	// Delete exact match if exists
	if (dm.has(path)) {
		dm.delete(path);
	}

	// Delete all descendants
	const prefix = `${path}/`;
	const keys = dm.keys().filter((k) => k.startsWith(prefix));
	for (const key of keys) {
		dm.delete(key);
	}
}

export const dataMapJsonPatchAdapter: JsonPatchAdapter = {
	kind: 'jsonpatch',
	name: 'data-map',
	features: {
		mutatesInput: false,
		supportsMoveAndCopy: true,
		supportsTest: true,
	},
	applyPatch: (doc, operations) => {
		try {
			const dm = createDataMap(structuredClone(doc as Record<string, unknown>));

			for (const op of operations) {
				const path = op.path;
				switch (op.op) {
					case 'add':
					case 'replace':
						setNestedValue(dm, path, op.value);
						break;
					case 'remove':
						deleteNestedValue(dm, path);
						break;
					case 'move':
						if (op.from) {
							const value = getNestedValue(dm, op.from);
							deleteNestedValue(dm, op.from);
							setNestedValue(dm, path, value);
						}
						break;
					case 'copy':
						if (op.from) {
							const value = getNestedValue(dm, op.from);
							setNestedValue(dm, path, structuredClone(value));
						}
						break;
					case 'test':
						const actual = getNestedValue(dm, path);
						if (JSON.stringify(actual) !== JSON.stringify(op.value)) {
							return {
								result: doc,
								error: new Error(
									`Test failed: expected ${JSON.stringify(op.value)}, got ${JSON.stringify(actual)}`,
								),
							};
						}
						break;
				}
			}

			return { result: dm.toObject() };
		} catch (e) {
			return { result: doc, error: e as Error };
		}
	},
	smokeTest: () => {
		const doc = { a: 1, b: { c: 2 } };
		const ops: JsonPatchOperation[] = [
			{ op: 'replace', path: '/a', value: 99 },
			{ op: 'add', path: '/b/d', value: 3 },
		];
		const { result, error } = dataMapJsonPatchAdapter.applyPatch(doc, ops);
		if (error) return false;
		const r = result as { a: number; b: { c: number; d: number } };
		return r.a === 99 && r.b.d === 3 && doc.a === 1;
	},
};
