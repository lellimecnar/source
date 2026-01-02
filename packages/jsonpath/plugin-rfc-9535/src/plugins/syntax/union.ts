import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createSyntaxUnionPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-rfc-9535/syntax-union',
			phases: [PluginPhases.syntax],
			capabilities: ['syntax:rfc9535:union'],
		},
		setup: () => undefined,
	});
