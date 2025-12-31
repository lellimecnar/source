import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-parent-selector',
		capabilities: ['extension:parent-selector'],
	},
};
