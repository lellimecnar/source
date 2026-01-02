import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-filter-functions',
		capabilities: ['filter:rfc9535:functions'],
	},
	setup: () => undefined,
};
