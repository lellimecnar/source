import { createPlugin, PluginPhases } from '@jsonpath/core';

export { FunctionRegistry } from './registry';
export type { JsonPathFunction } from './registry';

export const createFunctionsCorePlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-functions-core',
			phases: [PluginPhases.runtime],
			capabilities: ['functions:rfc9535:core'],
		},
		setup: () => undefined,
	});
