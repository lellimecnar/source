// @ts-expect-error - jsonpath lacks type definitions
import jp from 'jsonpath';

import { type JsonPathAdapter } from './types.js';

interface JsonpathModule {
	query: (obj: unknown, pathExpression: string) => unknown[];
	nodes: (
		obj: unknown,
		pathExpression: string,
	) => { path: (string | number)[]; value: unknown }[];
}

const jsonpath = jp as unknown as JsonpathModule;

export const jsonpathAdapter: JsonPathAdapter = {
	kind: 'jsonpath',
	name: 'jsonpath',
	features: {
		supportsFilter: true,
		supportsScriptExpressions: true,
		canReturnNodes: true,
	},
	queryValues: <T = unknown>(data: unknown, expression: string): T[] => {
		return jsonpath.query(data, expression) as T[];
	},
	queryNodes: (data: unknown, expression: string): unknown[] => {
		return jsonpath.nodes(data, expression);
	},
	smokeTest: (): boolean => {
		const data = { store: { book: [{ title: 'A' }, { title: 'B' }] } };
		const values = jsonpath.query(data, '$.store.book[*].title') as string[];
		const nodes = jsonpath.nodes(data, '$.store.book[*].title');
		return values.join(',') === 'A,B' && nodes.length === 2;
	},
};
