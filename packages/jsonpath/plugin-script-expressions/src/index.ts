import type { JsonPathPlugin } from '@jsonpath/core';

export { createCompartment } from './compartment';
export type { CreateCompartmentOptions } from './compartment';

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-script-expressions',
		capabilities: ['filter:script:ses'],
	},
	setup: () => undefined,
};
