import { bench, describe } from 'vitest';

import { STATE_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

const SIZES = [1_000, 10_000, 100_000] as const;

function makeInitial(n: number): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (let i = 0; i < n; i++) out[`k${i}`] = i;
	return out;
}

describe('State / Scale', () => {
	for (const adapter of STATE_ADAPTERS) {
		for (const n of SIZES) {
			bench(
				benchKey({
					category: 'state',
					caseName: `create${n}`,
					adapterName: adapter.name,
				}),
				() => {
					adapter.createStore(makeInitial(n));
				},
			);
		}
	}
});
