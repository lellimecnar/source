import { bench, describe } from 'vitest';

import { SIGNAL_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

describe('Signals / Comparative', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		bench(
			benchKey({
				category: 'signals',
				caseName: 'smoke',
				adapterName: adapter.name,
			}),
			() => {
				if (!adapter.smokeTest())
					throw new Error(`Smoke test failed: ${adapter.name}`);
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'create1',
				adapterName: adapter.name,
			}),
			() => {
				adapter.createSignal(0);
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'create100',
				adapterName: adapter.name,
			}),
			() => {
				for (let i = 0; i < 100; i++) adapter.createSignal(i);
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'read',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(0);
				let sum = 0;
				for (let i = 0; i < 1000; i++) sum += s.get();
				if (sum < 0) throw new Error('unreachable');
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'write',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(0);
				for (let i = 0; i < 1000; i++) s.set(i);
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'batchWrite100',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(0);
				adapter.batch(() => {
					for (let i = 0; i < 100; i++) s.set(i);
				});
			},
		);

		if (adapter.features.supportsComputed === true) {
			bench(
				benchKey({
					category: 'signals',
					caseName: 'computedCached',
					adapterName: adapter.name,
				}),
				() => {
					const s = adapter.createSignal(1);
					const c = adapter.createComputed(() => s.get() + 1);
					let sum = 0;
					for (let i = 0; i < 1000; i++) sum += c.get();
					if (sum < 0) throw new Error('unreachable');
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'computedDirty',
					adapterName: adapter.name,
				}),
				() => {
					const s = adapter.createSignal(1);
					const c = adapter.createComputed(() => s.get() + 1);
					for (let i = 0; i < 250; i++) {
						s.set(i);
						void c.get();
					}
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'diamondGraph',
					adapterName: adapter.name,
				}),
				() => {
					const a = adapter.createSignal(1);
					const b = adapter.createComputed(() => a.get() + 1);
					const c = adapter.createComputed(() => a.get() + 2);
					const d = adapter.createComputed(() => b.get() + c.get());
					for (let i = 0; i < 250; i++) {
						a.set(i);
						void d.get();
					}
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'deepChain',
					adapterName: adapter.name,
				}),
				() => {
					const base = adapter.createSignal(1);
					let cur = adapter.createComputed(() => base.get() + 1);
					for (let i = 0; i < 25; i++) {
						const prev = cur;
						cur = adapter.createComputed(() => prev.get() + 1);
					}
					for (let i = 0; i < 250; i++) {
						base.set(i);
						void cur.get();
					}
				},
			);
		}

		if (adapter.features.supportsEffect === true) {
			bench(
				benchKey({
					category: 'signals',
					caseName: 'effectTrigger',
					adapterName: adapter.name,
				}),
				() => {
					const s = adapter.createSignal(0);
					let ran = 0;
					const d = adapter.createEffect(() => {
						void s.get();
						ran++;
					});
					for (let i = 0; i < 100; i++) s.set(i);
					d.dispose();
					if (ran < 1) throw new Error('effect did not run');
				},
			);
		}
	}
});
