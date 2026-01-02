import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createResultNodePlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-result-node',
			phases: [PluginPhases.result],
			capabilities: ['result:node'],
		},
		setup: ({ engine }) => {
			engine.results.register('node', (nodes) => [...nodes]);
		},
	});
