import { batch, computed, effect, signal } from '@data-map/signals';
import { bench, describe } from 'vitest';

import { SIGNAL_ADAPTERS } from '../adapters';
import { benchKey } from '../utils/adapter-helpers.js';

describe('Browser / Signals', () => {
	describe('Signal Reads', () => {
		const s = signal(0);
		const c = computed(() => s.value + 1);

		bench(
			benchKey({
				category: 'browser.signals',
				caseName: 'signalRead',
				adapterName: 'data-map',
			}),
			() => {
				void s.value;
			},
		);

		bench(
			benchKey({
				category: 'browser.signals',
				caseName: 'computedRead',
				adapterName: 'data-map',
			}),
			() => {
				void c.value;
			},
		);
	});

	describe('Signal Writes', () => {
		let i = 0;
		for (const adapter of SIGNAL_ADAPTERS) {
			if (!adapter.features.supportsComputed) continue;

			bench(
				benchKey({
					category: 'browser.signals',
					caseName: 'write',
					adapterName: adapter.name,
				}),
				() => {
					const sig = adapter.createSignal(i++);
					sig.set(i++);
				},
			);
		}
	});

	describe('Batching', () => {
		const s = signal(0);

		bench(
			benchKey({
				category: 'browser.signals',
				caseName: 'batch10Writes',
				adapterName: 'data-map',
			}),
			() => {
				let count = 0;
				batch(() => {
					for (let j = 0; j < 10; j++) {
						s.value = count++;
					}
				});
			},
		);
	});

	describe('Effects', () => {
		bench(
			benchKey({
				category: 'browser.signals',
				caseName: 'effectCreate',
				adapterName: 'data-map',
			}),
			() => {
				const s = signal(1);
				const e = effect(() => {
					void s.value;
				});
				e.dispose();
			},
		);
	});
});
