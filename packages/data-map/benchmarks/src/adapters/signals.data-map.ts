import { batch, computed, effect, signal } from '@data-map/signals';

import type { SignalAdapter } from './types.js';

export const dataMapSignalsAdapter: SignalAdapter = {
	kind: 'signals',
	name: 'data-map',
	features: {
		supportsBatch: true,
		supportsComputed: true,
		supportsEffect: true,
		supportsRootDispose: false,
	},
	createSignal: <T>(initial: T) => {
		const s = signal(initial);
		return {
			get: () => s.value,
			set: (v) => {
				s.value = v;
			},
		};
	},
	createComputed: <T>(fn: () => T) => {
		const c = computed(fn);
		return { get: () => c.value };
	},
	createEffect: (fn: () => void) => {
		const h = effect(fn);
		return {
			dispose: () => {
				h.dispose();
			},
		};
	},
	batch,
	smokeTest: () => {
		const s = signal(1);
		const c = computed(() => s.value + 1);
		let ran = 0;
		const e = effect(() => {
			void c.value;
			ran++;
		});
		batch(() => {
			s.value = 2;
		});
		e.dispose();
		return c.value === 3 && ran >= 1;
	},
};
