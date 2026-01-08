import { computed, effect, root, signal, tick } from '@maverick-js/signals';

import type { SignalAdapter } from './types.js';

export const maverickSignalsAdapter: SignalAdapter = {
	kind: 'signals',
	name: 'maverick',
	features: {
		supportsBatch: 'unknown',
		supportsComputed: true,
		supportsEffect: true,
		supportsRootDispose: true,
	},
	createSignal: <T>(initial: T) => {
		const s = signal(initial);
		return {
			get: () => s() as T,
			set: (v) => {
				s.set(v as any);
				tick();
			},
		};
	},
	createComputed: <T>(fn: () => T) => {
		const c = computed(fn);
		return { get: () => c() as T };
	},
	createEffect: (fn: () => void) => {
		let stop: (() => void) | null = null;
		root((dispose) => {
			stop = effect(fn);
			// Keep both effect and root disposable.
			return dispose;
		});
		return { dispose: () => stop?.() };
	},
	batch: <T>(fn: () => T) => {
		const out = fn();
		tick();
		return out;
	},
	smokeTest: () => {
		return root((dispose) => {
			const a = signal(1);
			const c = computed(() => a() + 1);
			let ran = 0;
			const stop = effect(() => {
				void c();
				ran++;
			});
			a.set(2);
			tick();
			stop();
			dispose();
			return c() === 3 && ran >= 1;
		});
	},
};
