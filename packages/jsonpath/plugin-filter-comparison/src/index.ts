import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-filter-comparison',
		capabilities: ['filter:rfc9535:comparison'],
	},
};
