import { atom, computed, effect } from 'nanostores';

import type { SignalAdapter } from './types.js';

export const nanostoresSignalsAdapter: SignalAdapter = {
	kind: 'signals',
	name: 'nanostores',
	features: {
		supportsBatch: false,
		// Nanostores uses explicit dependency lists for computed/effect, which
		// doesn't fit the implicit dependency tracking model of this adapter interface.
		supportsComputed: false,
		supportsEffect: false,
		supportsRootDispose: false,
	},
	createSignal: <T>(initial: T) => {
		const s = atom(initial);
		return {
			get: () => s.get() as T,
			set: (v) => {
				s.set(v);
			},
		};
	},
	createComputed: () => {
		throw new Error(
			'nanostores adapter: computed not supported in normalized mode',
		);
	},
	createEffect: () => {
		throw new Error(
			'nanostores adapter: effect not supported in normalized mode',
		);
	},
	batch: <T>(fn: () => T) => fn(),
	smokeTest: () => {
		const s = atom(1);
		const c = computed(s, (v) => (v as number) + 1);
		let ran = 0;
		const cancel = effect([s], () => {
			void c.get();
			ran++;
			return () => {};
		});
		s.set(2);
		cancel();
		return (c.get() as number) === 3 && ran >= 1;
	},
};
