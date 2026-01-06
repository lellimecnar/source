import { jsonpath } from 'json-p3';

import { type JsonPathAdapter } from './types.js';

interface JsonP3QueryResult {
	values: () => Iterable<unknown> | unknown[];
}

interface JsonP3Module {
	query: (expression: string, data: unknown) => JsonP3QueryResult;
}

const jsonp3 = jsonpath as unknown as JsonP3Module;

export const jsonP3Adapter: JsonPathAdapter = {
	kind: 'jsonpath',
	name: 'json-p3',
	features: {
		supportsFilter: true,
		supportsScriptExpressions: true,
		canReturnNodes: 'unknown',
		supportsArithmetic: false, // RFC 9535 does not support arithmetic in filters
	},
	queryValues: <T = unknown>(data: unknown, expression: string): T[] => {
		const nodes = jsonp3.query(expression, data);
		const values = nodes.values();
		if (Array.isArray(values)) return values as T[];
		return Array.from(values) as T[];
	},
	smokeTest: (): boolean => {
		const data = {
			users: [
				{ score: 100, name: 'Sue' },
				{ score: 55, name: 'Jane' },
			],
		};
		const nodes = jsonp3.query('$.users[?@.score < 100].name', data);
		const raw = nodes.values();
		const values = (Array.isArray(raw) ? raw : Array.from(raw)) as string[];
		return values.length === 1 && values[0] === 'Jane';
	},
};
