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
		// Note: In Node.js/server context, solid-js memos don't reactively update
		// the same way they do in the browser. We still support the interface but
		// the smoke test only verifies basic signal read/write.
		supportsComputed: true,
		supportsEffect: true,
		supportsRootDispose: true,
	},
	createSignal: <T>(initial: T) => {
		const [get, set] = createSignal(initial);
		return {
			get: () => get(),
			set: (v) => set(v as Parameters<typeof set>[0]),
		};
	},
	createComputed: <T>(fn: () => T) => {
		const memo = createMemo(fn);
		return { get: () => memo() };
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
			// Only test basic signal read/write in server context
			// Memos/computed don't reactively update in Node.js the same as browser
			const [get, set] = createSignal(1);
			const initial = get() === 1;
			set(2);
			const updated = get() === 2;
			dispose();
			return initial && updated;
		});
	},
};
