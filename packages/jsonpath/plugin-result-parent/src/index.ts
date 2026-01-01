import type { JsonPathPlugin } from '@jsonpath/core';
import { formatPointer, getByPointer } from '@jsonpath/pointer';

function parentPointerFromLocation(location: any): string | null {
	const comps = (location?.components ?? []) as any[];
	if (comps.length === 0) return null;
	const parent = comps
		.slice(0, comps.length - 1)
		.map((c) => (c.kind === 'index' ? String(c.index) : String(c.name)));
	return formatPointer(parent);
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-result-parent',
		capabilities: ['result:parent'],
	},
	hooks: {
		registerResults: (registry) => {
			(registry as any).register('parent', (nodes: any[]) =>
				nodes.map((n) => {
					const p = parentPointerFromLocation(n.location);
					if (p == null) return undefined;
					return getByPointer(n.root, p);
				}),
			);
		},
	},
};
