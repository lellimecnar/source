import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-type-selectors',
		capabilities: ['extension:type-selectors'],
	},
	setup: () => undefined,
};
