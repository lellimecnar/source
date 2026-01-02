import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createFilterComparisonPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-rfc-9535/filter-comparison',
			phases: [PluginPhases.filter],
			capabilities: ['filter:rfc9535:comparison'],
		},
		setup: () => undefined,
	});
