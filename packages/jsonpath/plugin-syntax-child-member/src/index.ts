import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-child-member',
		capabilities: ['syntax:rfc9535:child-member'],
	},
};
