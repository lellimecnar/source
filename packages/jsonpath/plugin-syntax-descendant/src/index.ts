import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-descendant',
		capabilities: ['syntax:rfc9535:descendant'],
	},
};
