import type { JsonPathPlugin } from '@jsonpath/core';

export { matches } from './iregexp';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-iregexp',
		capabilities: ['regex:rfc9485:iregexp'],
	},
};
