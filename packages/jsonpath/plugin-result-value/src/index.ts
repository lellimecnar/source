import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-result-value',
		capabilities: ['result:value'],
	},
	hooks: {
		registerResults: (registry) => {
			(registry as any).register('value', (nodes: any[]) =>
				nodes.map((n) => n.value),
			);
		},
	},
};
