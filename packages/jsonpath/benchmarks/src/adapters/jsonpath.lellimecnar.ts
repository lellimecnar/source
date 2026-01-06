import { queryValues } from '@jsonpath/jsonpath';

import { type JsonPathAdapter } from './types.js';

const queryValuesFn = queryValues as unknown as <T = unknown>(
	data: unknown,
	expression: string,
) => T[];

export const lellimecnarJsonPathAdapter: JsonPathAdapter = {
	kind: 'jsonpath',
	name: '@jsonpath/jsonpath',
	features: {
		supportsFilter: true,
		supportsScriptExpressions: true,
		canReturnNodes: false,
		supportsArithmetic: true,
	},
	queryValues: <T = unknown>(data: unknown, expression: string): T[] => {
		return queryValuesFn<T>(data, expression);
	},
	smokeTest: (): boolean => {
		const data = { a: { b: [1, 2, 3] } };
		const values = queryValuesFn<number>(data, '$.a.b[*]');
		return values.length === 3 && values[0] === 1;
	},
};
