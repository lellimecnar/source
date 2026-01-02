import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createFilterRegexPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-rfc-9535/filter-regex',
			phases: [PluginPhases.filter],
			capabilities: ['filter:rfc9535:regex'],
		},
		setup: () => undefined,
	});
