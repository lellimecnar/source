import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createFilterExistencePlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-rfc-9535/filter-existence',
			phases: [PluginPhases.filter],
			capabilities: ['filter:rfc9535:existence'],
		},
		setup: () => undefined,
	});
