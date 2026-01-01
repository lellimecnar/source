import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-result-node',
		capabilities: ['result:node'],
	},
	setup: ({ engine }) => {
		engine.results.register('node', (nodes) => [...nodes]);
	},
};
