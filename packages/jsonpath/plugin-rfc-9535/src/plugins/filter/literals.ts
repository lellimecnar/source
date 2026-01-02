import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createFilterLiteralsPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-filter-literals',
			phases: [PluginPhases.filter],
			capabilities: ['filter:rfc9535:literals'],
		},
		setup: () => undefined,
	});
