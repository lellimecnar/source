import { batch, computed, effect, signal } from '@data-map/signals';
import { bench, describe } from 'vitest';

describe('Baselines / Signals', () => {
	const s = signal(0);
	const c = computed(() => s.value + 1);
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

	bench('signals.effectDispose', () => {
		handle.dispose();
	});
});
