import { query as runQuery } from '@jsonpath/jsonpath';
import { JSONPointer } from '@jsonpath/pointer';

import {
	iteratePointersForSimpleJsonPath,
	parseSimpleJsonPath,
} from './pointer-iterator.js';
import type { QueryResult } from './types.js';

export interface FlatStoreQueryable {
	get: (pointer: string) => unknown;
	has: (pointer: string) => boolean;
	keys: (prefix?: string) => IterableIterator<string>;
	getObject: (pointer: string) => unknown;
}

function getFromMaterializedRoot(root: unknown, pointer: string): unknown {
	if (pointer === '') return root;
	// JSONPointer.get is not available in this workspace API; parse + walk.
	const segs = JSONPointer.parse(pointer);
	let cur: any = root;
	for (const seg of segs) {
		if (cur === null || typeof cur === 'undefined') return undefined;
		cur = cur[seg as any];
	}
	return cur;
}

export function queryFlat(
	store: FlatStoreQueryable,
	path: string,
): QueryResult {
	const tokens = parseSimpleJsonPath(path);
	if (tokens) {
		const pointers = Array.from(
			iteratePointersForSimpleJsonPath(store, tokens),
		);

		// Heuristic: if a query expands to many pointers, calling getObject(pointer)
		// per pointer becomes catastrophic. Materialize the root once and read from it.
		// Keep this threshold high so small queries retain the localized getObject behavior.
		const MATERIALIZE_ROOT_THRESHOLD = 64;

		if (pointers.length >= MATERIALIZE_ROOT_THRESHOLD) {
			const root = store.getObject('') as Record<string, unknown>;
			const values = pointers.map((p) => {
				if (store.has(p)) return store.get(p);
				return getFromMaterializedRoot(root, p);
			});
			return { values, pointers };
		}

		const values = pointers.map((p) => {
			if (store.has(p)) return store.get(p);
			return store.getObject(p);
		});
		return { values, pointers };
	}

	const root = store.getObject('') as Record<string, unknown>;
	const res = runQuery(root, path);
	return {
		values: res.values(),
		pointers: res.pointers().map((p) => p.toString()),
	};
}
