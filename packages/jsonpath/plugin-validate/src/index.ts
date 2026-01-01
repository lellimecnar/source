import type { JsonPathPlugin } from '@jsonpath/core';

export type { Issue, ValidatorAdapter } from './types';
export { validateAll } from './validate';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-validate',
		capabilities: ['validate'],
	},
	setup: () => undefined,
};
