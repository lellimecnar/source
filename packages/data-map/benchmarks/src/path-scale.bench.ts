import { bench, describe } from 'vitest';

import { PATH_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

const WIDTHS = [1_000, 10_000, 100_000] as const;

function makeWide(n: number): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (let i = 0; i < n; i++) out[`k${i}`] = i;
	return { wide: out };
}

describe('Path / Scale', () => {
	for (const adapter of PATH_ADAPTERS) {
		for (const n of WIDTHS) {
			bench(
				benchKey({
					category: 'path',
					caseName: `getWide${n}`,
					adapterName: adapter.name,
				}),
				() => {
					const obj = makeWide(n);
					adapter.get(obj, `wide.k${n - 1}`);
				},
			);
		}
	}
});
