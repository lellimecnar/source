import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-result-pointer',
		capabilities: ['result:pointer'],
	},
};
