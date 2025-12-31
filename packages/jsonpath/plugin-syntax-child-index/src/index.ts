import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-child-index',
		capabilities: ['syntax:rfc9535:child-index', 'syntax:rfc9535:slice'],
	},
};
