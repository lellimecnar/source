import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-filter-regex',
		capabilities: ['filter:rfc9535:regex'],
	},
	setup: () => undefined,
};
