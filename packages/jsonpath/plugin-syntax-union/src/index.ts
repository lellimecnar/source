import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-union',
		capabilities: ['syntax:rfc9535:union'],
	},
	setup: () => undefined,
};
