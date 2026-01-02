import type { JsonPathPlugin } from '@jsonpath/core';

export { compile, matchesEntire, searches } from './iregexp';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-iregexp',
		capabilities: ['regex:rfc9485:iregexp'],
	},
	setup: () => undefined,
};
