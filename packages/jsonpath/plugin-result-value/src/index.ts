import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-result-value',
		capabilities: ['result:value'],
	},
	setup: ({ engine }) => {
		engine.results.register('value', (nodes) => nodes.map((n) => n.value));
	},
};
