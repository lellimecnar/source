import { createPlugin, PluginPhases } from '@jsonpath/core';
import { formatPointer } from '@jsonpath/pointer';

function pointerFromLocation(location: any): string {
	const parts = (location?.components ?? []).map((c: any) =>
		c.kind === 'index' ? String(c.index) : String(c.name),
	);
	return formatPointer(parts);
}

export const createResultPointerPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-rfc-9535/result-pointer',
			phases: [PluginPhases.result],
			capabilities: ['result:pointer'],
		},
		setup: ({ engine }) => {
			engine.results.register('pointer', (nodes) =>
				nodes.map((n) => pointerFromLocation(n.location)),
			);
		},
	});
