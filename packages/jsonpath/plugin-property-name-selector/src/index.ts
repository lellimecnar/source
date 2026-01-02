import type { JsonPathPlugin } from '@jsonpath/core';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-property-name-selector',
		capabilities: ['extension:property-name-selector'],
	},
	setup: () => undefined,
};
