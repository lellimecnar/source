import type { JsonPathPlugin } from '@jsonpath/core';
import { formatPointer } from '@jsonpath/pointer';

function pointerFromLocation(location: any): string {
	const parts = (location?.components ?? []).map((c: any) =>
		c.kind === 'index' ? String(c.index) : String(c.name),
	);
	return formatPointer(parts);
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-result-pointer',
		capabilities: ['result:pointer'],
	},
	setup: ({ engine }) => {
		engine.results.register('pointer', (nodes: any[]) =>
			nodes.map((n) => pointerFromLocation(n.location)),
		);
	},
};
