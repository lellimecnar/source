import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createFilterBooleanPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-filter-boolean',
			phases: [PluginPhases.filter],
			capabilities: ['filter:rfc9535:boolean'],
		},
		setup: () => undefined,
	});
