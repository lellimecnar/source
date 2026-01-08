import {
	batch,
	createEffect,
	createMemo,
	createRoot,
	createSignal,
} from 'solid-js';

import type { SignalAdapter } from './types.js';

export const solidSignalsAdapter: SignalAdapter = {
	kind: 'signals',
	name: 'solid',
	features: {
		supportsBatch: true,
		supportsComputed: true,
		supportsEffect: true,
		supportsRootDispose: true,
	},
	createSignal: <T>(initial: T) => {
		const [get, set] = createSignal(initial);
		return {
			get: () => get() as T,
			set: (v) => set(v as any),
		};
	},
	createComputed: <T>(fn: () => T) => {
		const memo = createMemo(fn);
		return { get: () => memo() as T };
	},
	createEffect: (fn: () => void) => {
		let disposeRoot: (() => void) | null = null;
		createRoot((dispose) => {
			disposeRoot = dispose;
			createEffect(fn);
		});
		return { dispose: () => disposeRoot?.() };
	},
	batch,
	smokeTest: () => {
		return createRoot((dispose) => {
			const [get, set] = createSignal(1);
			const memo = createMemo(() => get() + 1);
			let ran = 0;
			createEffect(() => {
				void memo();
				ran++;
			});
			batch(() => set(2));
			dispose();
			return memo() === 3 && ran >= 1;
		});
	},
};
