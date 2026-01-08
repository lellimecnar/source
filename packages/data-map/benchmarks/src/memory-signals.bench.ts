import { batch, computed, effect, signal } from '@data-map/signals';
import { bench, describe } from 'vitest';

import {
	captureMemory,
	deltaMemory,
	warmupGC,
} from './utils/memory-profiler.js';

describe('Memory / Signals', () => {
	bench('memory.signalCreation1000', () => {
		warmupGC();
		const before = captureMemory();

		const signals = Array.from({ length: 1000 }, () => signal(0));

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		// Just record the delta for analysis
		void delta;
		void signals;
	});

	bench('memory.computedChain100', () => {
		warmupGC();
		const before = captureMemory();

		const s = signal(0);
		let current = s;
		for (let i = 0; i < 100; i++) {
			// eslint-disable-next-line @typescript-eslint/no-loop-func
			current = computed(() => (current as any).value + 1) as any;
		}

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		void delta;
		void current;
	});

	bench('memory.effectCreation1000', () => {
		warmupGC();
		const before = captureMemory();

		const effects = Array.from({ length: 1000 }, (_, i) => {
			const s = signal(i);
			const handle = effect(() => {
				void s.value;
			});
			return { s, handle };
		});

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		// Cleanup
		for (const { handle } of effects) {
			handle.dispose();
		}

		void delta;
		void effects;
	});

	bench('memory.batchLargeUpdate', () => {
		warmupGC();
		const before = captureMemory();

		const signals = Array.from({ length: 100 }, () => signal(0));
		batch(() => {
			for (let i = 0; i < 10000; i++) {
				const idx = i % signals.length;
				signals[idx].value = i;
			}
		});

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		void delta;
		void signals;
	});
});
