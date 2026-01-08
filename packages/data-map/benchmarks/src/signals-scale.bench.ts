import { bench, describe } from 'vitest';

import { SIGNAL_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

const COUNTS = [1, 100, 10_000];

describe('Signals / Scale', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		for (const count of COUNTS) {
			bench(
				benchKey({
					category: 'signals',
					caseName: `create${count}`,
					adapterName: adapter.name,
				}),
				() => {
					for (let i = 0; i < count; i++) adapter.createSignal(i);
				},
			);
		}

		if (adapter.features.supportsComputed === true) {
			for (const count of COUNTS) {
				bench(
					benchKey({
						category: 'signals',
						caseName: `createComputeds${count}`,
						adapterName: adapter.name,
					}),
					() => {
						const signals = [];
						for (let i = 0; i < count; i++) {
							signals.push(adapter.createSignal(i));
						}
						for (const s of signals) {
							adapter.createComputed(() => s.get() + 1);
						}
					},
				);
			}
		}

		if (adapter.features.supportsEffect === true) {
			for (const count of COUNTS) {
				bench(
					benchKey({
						category: 'signals',
						caseName: `createEffects${count}`,
						adapterName: adapter.name,
					}),
					() => {
						const signals = [];
						for (let i = 0; i < count; i++) {
							signals.push(adapter.createSignal(i));
						}
						const disposers = [];
						for (const s of signals) {
							const d = adapter.createEffect(() => {
								void s.get();
							});
							disposers.push(d);
						}
						for (const d of disposers) d.dispose();
					},
				);
			}
		}
	}
});
