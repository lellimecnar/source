import { query as runQuery } from '@jsonpath/jsonpath';

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

export function queryFlat(
	store: FlatStoreQueryable,
	path: string,
): QueryResult {
	const tokens = parseSimpleJsonPath(path);
	if (tokens) {
		const pointers = Array.from(
			iteratePointersForSimpleJsonPath(store, tokens),
		);
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
