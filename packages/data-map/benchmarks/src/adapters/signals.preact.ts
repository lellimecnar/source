import { batch, computed, effect, signal } from '@preact/signals-core';

import type { SignalAdapter } from './types.js';

export const preactSignalsAdapter: SignalAdapter = {
	kind: 'signals',
	name: 'preact',
	features: {
		supportsBatch: true,
		supportsComputed: true,
		supportsEffect: true,
		supportsRootDispose: false,
	},
	createSignal: <T>(initial: T) => {
		const s = signal(initial);
		return {
			get: () => s.value as T,
			set: (v) => {
				s.value = v as any;
			},
		};
	},
	createComputed: <T>(fn: () => T) => {
		const c = computed(fn);
		return { get: () => c.value as T };
	},
	createEffect: (fn: () => void) => {
		const dispose = effect(fn);
		return { dispose };
	},
	batch,
	smokeTest: () => {
		const s = signal(1);
		const c = computed(() => (s.value as number) + 1);
		let ran = 0;
		const dispose = effect(() => {
			void c.value;
			ran++;
		});
		batch(() => {
			s.value = 2;
		});
		dispose();
		return (c.value as number) === 3 && ran >= 1;
	},
};
