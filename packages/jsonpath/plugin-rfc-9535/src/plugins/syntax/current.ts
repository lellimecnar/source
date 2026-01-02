import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createSyntaxCurrentPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-syntax-current',
			phases: [PluginPhases.syntax],
			capabilities: ['syntax:rfc9535:current'],
		},
		setup: () => undefined,
	});
