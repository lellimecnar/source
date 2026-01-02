import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createResultValuePlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-result-value',
			phases: [PluginPhases.result],
			capabilities: ['result:value'],
		},
		setup: ({ engine }) => {
			engine.results.register('value', (nodes) => nodes.map((n) => n.value));
		},
	});
