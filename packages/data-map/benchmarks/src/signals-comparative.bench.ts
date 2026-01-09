/**
 * Signals Comparative Benchmarks
 *
 * Compares performance of reactive signal libraries:
 * - @data-map/core
 * - @preact/signals-core
 * - @maverick-js/signals
 * - @vue/reactivity
 * - nanostores
 * - solid-js
 */
import { bench, describe } from 'vitest';

import { SIGNAL_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

// ============================================================================
// Basic Signal Operations
// ============================================================================

describe('Signals / Basic Operations', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		bench(
			benchKey({
				category: 'signals',
				caseName: 'smoke',
				adapterName: adapter.name,
			}),
			() => {
				if (!adapter.smokeTest())
					throw new Error(`Smoke test failed: ${adapter.name}`);
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'create1',
				adapterName: adapter.name,
			}),
			() => {
				adapter.createSignal(0);
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'read1',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(42);
				void s.get();
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'write1',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(0);
				s.set(1);
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'readWrite1',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(0);
				s.set(s.get() + 1);
			},
		);
	}
});

// ============================================================================
// Scale: Create Many Signals
// ============================================================================

describe('Signals / Create Scale', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		bench(
			benchKey({
				category: 'signals',
				caseName: 'create100',
				adapterName: adapter.name,
			}),
			() => {
				for (let i = 0; i < 100; i++) adapter.createSignal(i);
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'create1000',
				adapterName: adapter.name,
			}),
			() => {
				for (let i = 0; i < 1000; i++) adapter.createSignal(i);
			},
		);
	}
});

// ============================================================================
// Scale: Read/Write Operations
// ============================================================================

describe('Signals / Read/Write Scale', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		bench(
			benchKey({
				category: 'signals',
				caseName: 'read1000',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(0);
				let sum = 0;
				for (let i = 0; i < 1000; i++) sum += s.get();
				if (sum < 0) throw new Error('unreachable');
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'write1000',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(0);
				for (let i = 0; i < 1000; i++) s.set(i);
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'readWrite500',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(0);
				for (let i = 0; i < 500; i++) {
					s.set(s.get() + 1);
				}
			},
		);
	}
});

// ============================================================================
// Batching
// ============================================================================

describe('Signals / Batching', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		bench(
			benchKey({
				category: 'signals',
				caseName: 'batchWrite100',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(0);
				adapter.batch(() => {
					for (let i = 0; i < 100; i++) s.set(i);
				});
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'batchWrite1000',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal(0);
				adapter.batch(() => {
					for (let i = 0; i < 1000; i++) s.set(i);
				});
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'batchMultiSignal10',
				adapterName: adapter.name,
			}),
			() => {
				const signals = Array.from({ length: 10 }, (_, i) =>
					adapter.createSignal(i),
				);
				adapter.batch(() => {
					for (const s of signals) {
						s.set(s.get() + 1);
					}
				});
			},
		);
	}
});

// ============================================================================
// Computed Values
// ============================================================================

describe('Signals / Computed', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		if (adapter.features.supportsComputed === true) {
			bench(
				benchKey({
					category: 'signals',
					caseName: 'computedCreate',
					adapterName: adapter.name,
				}),
				() => {
					const s = adapter.createSignal(1);
					adapter.createComputed(() => s.get() + 1);
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'computedCached',
					adapterName: adapter.name,
				}),
				() => {
					const s = adapter.createSignal(1);
					const c = adapter.createComputed(() => s.get() + 1);
					let sum = 0;
					for (let i = 0; i < 1000; i++) sum += c.get();
					if (sum < 0) throw new Error('unreachable');
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'computedDirty',
					adapterName: adapter.name,
				}),
				() => {
					const s = adapter.createSignal(1);
					const c = adapter.createComputed(() => s.get() + 1);
					for (let i = 0; i < 250; i++) {
						s.set(i);
						void c.get();
					}
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'computedChain3',
					adapterName: adapter.name,
				}),
				() => {
					const a = adapter.createSignal(1);
					const b = adapter.createComputed(() => a.get() * 2);
					const c = adapter.createComputed(() => b.get() * 2);
					for (let i = 0; i < 100; i++) {
						a.set(i);
						void c.get();
					}
				},
			);
		}
	}
});

// ============================================================================
// Diamond Dependency Graph
// ============================================================================

describe('Signals / Diamond Graph', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		if (adapter.features.supportsComputed === true) {
			bench(
				benchKey({
					category: 'signals',
					caseName: 'diamondSmall',
					adapterName: adapter.name,
				}),
				() => {
					const a = adapter.createSignal(1);
					const b = adapter.createComputed(() => a.get() + 1);
					const c = adapter.createComputed(() => a.get() + 2);
					const d = adapter.createComputed(() => b.get() + c.get());
					for (let i = 0; i < 250; i++) {
						a.set(i);
						void d.get();
					}
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'diamondMedium',
					adapterName: adapter.name,
				}),
				() => {
					const a = adapter.createSignal(1);
					const b = adapter.createComputed(() => a.get() + 1);
					const c = adapter.createComputed(() => a.get() + 2);
					const d = adapter.createComputed(() => a.get() + 3);
					const e = adapter.createComputed(() => b.get() + c.get() + d.get());
					for (let i = 0; i < 250; i++) {
						a.set(i);
						void e.get();
					}
				},
			);
		}
	}
});

// ============================================================================
// Deep Computed Chain
// ============================================================================

describe('Signals / Deep Chain', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		if (adapter.features.supportsComputed === true) {
			bench(
				benchKey({
					category: 'signals',
					caseName: 'deepChain10',
					adapterName: adapter.name,
				}),
				() => {
					const base = adapter.createSignal(1);
					let cur = adapter.createComputed(() => base.get() + 1);
					for (let i = 0; i < 10; i++) {
						const prev = cur;
						cur = adapter.createComputed(() => prev.get() + 1);
					}
					for (let i = 0; i < 100; i++) {
						base.set(i);
						void cur.get();
					}
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'deepChain25',
					adapterName: adapter.name,
				}),
				() => {
					const base = adapter.createSignal(1);
					let cur = adapter.createComputed(() => base.get() + 1);
					for (let i = 0; i < 25; i++) {
						const prev = cur;
						cur = adapter.createComputed(() => prev.get() + 1);
					}
					for (let i = 0; i < 250; i++) {
						base.set(i);
						void cur.get();
					}
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'deepChain50',
					adapterName: adapter.name,
				}),
				() => {
					const base = adapter.createSignal(1);
					let cur = adapter.createComputed(() => base.get() + 1);
					for (let i = 0; i < 50; i++) {
						const prev = cur;
						cur = adapter.createComputed(() => prev.get() + 1);
					}
					for (let i = 0; i < 100; i++) {
						base.set(i);
						void cur.get();
					}
				},
			);
		}
	}
});

// ============================================================================
// Effects
// ============================================================================

describe('Signals / Effects', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		if (adapter.features.supportsEffect === true) {
			bench(
				benchKey({
					category: 'signals',
					caseName: 'effectCreate',
					adapterName: adapter.name,
				}),
				() => {
					const s = adapter.createSignal(0);
					const d = adapter.createEffect(() => {
						void s.get();
					});
					d.dispose();
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'effectTrigger100',
					adapterName: adapter.name,
				}),
				() => {
					const s = adapter.createSignal(0);
					let ran = 0;
					const d = adapter.createEffect(() => {
						void s.get();
						ran++;
					});
					for (let i = 0; i < 100; i++) s.set(i);
					d.dispose();
					if (ran < 1) throw new Error('effect did not run');
				},
			);

			bench(
				benchKey({
					category: 'signals',
					caseName: 'effectMultiple5',
					adapterName: adapter.name,
				}),
				() => {
					const s = adapter.createSignal(0);
					let total = 0;
					const disposers = Array.from({ length: 5 }, () =>
						adapter.createEffect(() => {
							void s.get();
							total++;
						}),
					);
					for (let i = 0; i < 50; i++) s.set(i);
					for (const d of disposers) d.dispose();
					if (total < 5) throw new Error('effects did not run');
				},
			);
		}
	}
});

// ============================================================================
// Complex Object Values
// ============================================================================

describe('Signals / Object Values', () => {
	for (const adapter of SIGNAL_ADAPTERS) {
		bench(
			benchKey({
				category: 'signals',
				caseName: 'objectCreate',
				adapterName: adapter.name,
			}),
			() => {
				adapter.createSignal({ x: 1, y: 2, data: { nested: true } });
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'objectUpdate',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal({ count: 0 });
				for (let i = 0; i < 100; i++) {
					s.set({ count: i });
				}
			},
		);

		bench(
			benchKey({
				category: 'signals',
				caseName: 'arrayUpdate',
				adapterName: adapter.name,
			}),
			() => {
				const s = adapter.createSignal<number[]>([]);
				for (let i = 0; i < 100; i++) {
					s.set([...s.get(), i]);
				}
			},
		);
	}
});
