import type { JsonPathPlugin } from '@jsonpath/core';

export { FunctionRegistry } from './registry';
export type { JsonPathFunction } from './registry';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-functions-core',
		capabilities: ['functions:rfc9535:core'],
	},
};
