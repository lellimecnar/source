import { JSONPath } from 'jsonpath-plus';

import type { JsonPathAdapter } from './types.js';

export const jsonpathPlusAdapter: JsonPathAdapter = {
	kind: 'jsonpath',
	name: 'jsonpath-plus',
	features: {
		supportsFilter: true,
		supportsScriptExpressions: true,
		canReturnNodes: true,
	},
	queryValues: <T = unknown>(data: unknown, expression: string): T[] => {
		return JSONPath({ path: expression, json: data }) as T[];
	},
	queryNodes: (data: unknown, expression: string): unknown[] => {
		return JSONPath({ path: expression, json: data, resultType: 'all' });
	},
	smokeTest: (): boolean => {
		const data = { store: { book: [{ price: 1 }, { price: 2 }] } };
		const values: number[] = JSONPath({
			path: '$.store.book[*].price',
			json: data,
		});
		const nodes = JSONPath({
			path: '$.store.book[*].price',
			json: data,
			resultType: 'all',
		});
		const sum = values.reduce((a, b) => a + b, 0);
		return sum === 3 && (nodes as unknown[]).length === 2;
	},
};
