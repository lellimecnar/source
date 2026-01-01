import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-result-node',
		capabilities: ['result:node'],
	},
	hooks: {
		registerResults: (registry) => {
			(registry as any).register('node', (nodes: any[]) => nodes);
		},
	},
};
