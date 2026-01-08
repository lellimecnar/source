import { computed, effect, ref } from '@vue/reactivity';

import type { SignalAdapter } from './types.js';

export const vueSignalsAdapter: SignalAdapter = {
	kind: 'signals',
	name: 'vue',
	features: {
		supportsBatch: false,
		supportsComputed: true,
		supportsEffect: true,
		supportsRootDispose: false,
	},
	createSignal: <T>(initial: T) => {
		const r = ref(initial) as any;
		return {
			get: () => r.value as T,
			set: (v) => {
				r.value = v as any;
			},
		};
	},
	createComputed: <T>(fn: () => T) => {
		const c = computed(fn) as any;
		return { get: () => c.value as T };
	},
	createEffect: (fn: () => void) => {
		const stop = effect(fn) as unknown as () => void;
		return {
			dispose: () => {
				stop();
			},
		};
	},
	batch: <T>(fn: () => T) => fn(),
	smokeTest: () => {
		const r = ref(1) as any;
		const c = computed(() => (r.value as number) + 1) as any;
		let ran = 0;
		const stop = effect(() => {
			void c.value;
			ran++;
		}) as unknown as () => void;
		r.value = 2;
		stop();
		return (c.value as number) === 3 && ran >= 1;
	},
};
