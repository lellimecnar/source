import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createFilterFunctionsPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-rfc-9535/filter-functions',
			phases: [PluginPhases.filter],
			capabilities: ['filter:rfc9535:functions'],
		},
		setup: () => undefined,
	});
