import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-current',
		capabilities: ['syntax:rfc9535:current'],
	},
};
