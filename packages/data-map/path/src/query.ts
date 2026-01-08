import { query as runQuery } from '@jsonpath/jsonpath';

import type { QueryResult } from './types.js';

export interface FlatStoreQueryable {
	toObject: () => Record<string, unknown>;
}

export function queryFlat(
	store: FlatStoreQueryable,
	path: string,
): QueryResult {
	const root = store.toObject();
	const res = runQuery(root, path);
	return {
		values: res.values(),
		pointers: res.pointers().map((p) => p.toString()),
	};
}
