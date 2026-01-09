import { atom, computed, onSet } from 'nanostores';

import type { SignalAdapter } from './types.js';

export const nanostoresSignalsAdapter: SignalAdapter = {
	kind: 'signals',
	name: 'nanostores',
	features: {
		supportsBatch: false,
		// Nanostores uses explicit dependency lists for computed, which
		// doesn't fit the implicit dependency tracking model of this adapter interface.
		supportsComputed: false,
		supportsEffect: false,
		supportsRootDispose: false,
	},
	createSignal: <T>(initial: T) => {
		const s = atom(initial);
		return {
			get: () => s.get(),
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
		const c = computed(s, (v) => v + 1);
		let ran = 0;
		// Use onSet to simulate effect behavior
		const cancel = onSet(s, () => {
			ran++;
		});
		s.set(2);
		cancel();
		return c.get() === 3 && ran >= 1;
	},
};
