import { JSONPath } from 'jsonpath-plus';

import type { JsonPathAdapter } from './types.js';

export const jsonpathPlusAdapter: JsonPathAdapter = {
	kind: 'jsonpath',
	name: 'jsonpath-plus',
	features: {
		supportsFilter: true,
		supportsScriptExpressions: true,
		canReturnNodes: true,
		supportsArithmetic: true,
	},
	queryValues: <T = unknown>(data: unknown, expression: string): T[] => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return JSONPath({
			path: expression,
			json: data,
		} as any) as unknown as T[];
	},
	queryNodes: (data: unknown, expression: string): unknown[] => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return JSONPath({
			path: expression,
			json: data,
			resultType: 'all',
		} as any) as unknown as unknown[];
	},
	smokeTest: (): boolean => {
		const data: unknown = { store: { book: [{ price: 1 }, { price: 2 }] } };

		const values: number[] = JSONPath({
			path: '$.store.book[*].price',
			json: data as any,
		});

		const nodes = JSONPath({
			path: '$.store.book[*].price',
			json: data as any,
			resultType: 'all',
		});
		const sum = values.reduce((a, b) => a + b, 0);
		return sum === 3 && (nodes as unknown[]).length === 2;
	},
};
