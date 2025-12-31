import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-filter',
		capabilities: ['syntax:rfc9535:filter'],
	},
};
