import type { JsonPathPlugin } from '@jsonpath/core';

export type {
	Issue,
	ValidatorAdapter,
	ValidationItem,
	ValidationResult,
} from './types';
export { validateAll, validateQuerySync } from './validate';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-validate',
		capabilities: ['validate'],
	},
	setup: () => undefined,
};
