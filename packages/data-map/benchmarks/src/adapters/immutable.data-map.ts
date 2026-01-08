import { createDataMap } from '@data-map/core';

import type { ImmutableAdapter, ImmutableDraft } from './types.js';

export const dataMapImmutableAdapter: ImmutableAdapter = {
	kind: 'immutable',
	name: 'data-map',
	features: {
		mutatesInput: false,
		pathSyntax: 'pointer',
	},
	produce: (base, recipe) => {
		const dm = createDataMap(
			structuredClone((base ?? {}) as Record<string, unknown>),
		);
		const draft: ImmutableDraft = {
			get: (path) => dm.get(path),
			set: (path, value) => {
				dm.set(path, value);
			},
			del: (path) => {
				dm.delete(path);
			},
		};
		recipe(draft);
		return dm.toObject();
	},
	smokeTest: () => {
		const base = { a: { b: 1 } };
		const next = dataMapImmutableAdapter.produce(base, (d) => {
			d.set('/a/b', 2);
		}) as any;
		return base.a.b === 1 && next.a.b === 2;
	},
};
