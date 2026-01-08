import { batch, computed, effect, signal } from '@data-map/signals';
import { bench, describe } from 'vitest';

describe('Signals', () => {
	const s = signal(0);
	const c = computed(() => s.value + 1);

	// Keep an effect around to ensure dependency graphs are exercised.
	const handle = effect(() => {
		void c.value;
	});

	let i = 0;

	bench('signals.signalRead', () => {
		void s.value;
	});

	bench('signals.signalWrite', () => {
		s.value = i++;
	});

	bench('signals.computedReadCached', () => {
		void c.value;
	});

	bench('signals.computedReadDirty', () => {
		s.value = i++;
		void c.value;
	});

	bench('signals.batch100Writes', () => {
		batch(() => {
			for (let j = 0; j < 100; j++) s.value = i++;
		});
	});

	// Prevent tree-shaking / ensure the effect is not considered unused.
	bench('signals.effectDispose', () => {
		handle.dispose();
	});
});
