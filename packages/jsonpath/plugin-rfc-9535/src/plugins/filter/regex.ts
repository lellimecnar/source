import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createFilterRegexPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-filter-regex',
			phases: [PluginPhases.filter],
			capabilities: ['filter:rfc9535:regex'],
		},
		setup: () => undefined,
	});
