import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-filter-boolean',
		capabilities: ['filter:rfc9535:boolean'],
	},
	setup: () => undefined,
};
