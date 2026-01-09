import { describe, expect, it, vi } from 'vitest';
import { batch, computed, effect, signal, untracked } from '../index.js';

describe('signals', () => {
	it('signal read/write and subscribe', () => {
		const s = signal(1);
		const seen: number[] = [];
		const unsub = s.subscribe((v) => seen.push(v));
		expect(s.value).toBe(1);
		s.value = 2;
		s.value = 3;
		unsub();
		s.value = 4;
		expect(seen).toEqual([2, 3]);
	});

	it('signal.peek does not track effects', () => {
		const s = signal(1);
		const fn = vi.fn(() => {
			s.peek();
		});

		effect(fn);
		expect(fn).toHaveBeenCalledTimes(1);

		s.value = 2;
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('signal.peek does not track computed dependencies', () => {
		const s = signal(1);
		let runs = 0;

		const c = computed(() => {
			runs++;
			return s.peek() + 1;
		});

		expect(c.value).toBe(2);
		expect(runs).toBe(1);

		s.value = 2;
		expect(c.value).toBe(2);
		expect(runs).toBe(1);
	});

	it('computed tracks dependencies lazily', () => {
		const a = signal(1);
		const b = signal(2);
		let runs = 0;
		const c = computed(() => {
			runs++;
			return a.value + b.value;
		});

		expect(runs).toBe(0);
		expect(c.value).toBe(3);
		expect(runs).toBe(1);

		a.value = 2;
		expect(runs).toBe(1);
		expect(c.value).toBe(4);
		expect(runs).toBe(2);
	});

	it('untracked prevents dependency tracking', () => {
		const s = signal(0);
		const fn = vi.fn(() => {
			untracked(() => {
				s.value;
			});
		});

		effect(fn);
		expect(fn).toHaveBeenCalledTimes(1);

		s.value = 1;
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('effect re-runs on dependency changes and runs cleanup', () => {
		const s = signal(0);
		const cleanup = vi.fn();
		const fn = vi.fn(() => {
			s.value;
			return cleanup;
		});
		const e = effect(fn);

		expect(fn).toHaveBeenCalledTimes(1);
		s.value = 1;
		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledTimes(2);

		e.dispose();
		s.value = 2;
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('nested effects: inner tracks separately from outer', () => {
		const a = signal(0);
		const b = signal(0);

		const innerFn = vi.fn(() => {
			b.value;
		});

		const outerFn = vi.fn(() => {
			a.value;

			const inner = effect(innerFn);
			return () => {
				inner.dispose();
			};
		});

		const outer = effect(outerFn);

		expect(outerFn).toHaveBeenCalledTimes(1);
		expect(innerFn).toHaveBeenCalledTimes(1);

		b.value = 1;
		expect(innerFn).toHaveBeenCalledTimes(2);
		expect(outerFn).toHaveBeenCalledTimes(1);

		a.value = 1;
		expect(outerFn).toHaveBeenCalledTimes(2);
		expect(innerFn).toHaveBeenCalledTimes(3);

		outer.dispose();
		b.value = 2;
		expect(innerFn).toHaveBeenCalledTimes(3);
	});

	it('batch coalesces effect notifications', () => {
		const a = signal(1);
		const b = signal(2);
		const fn = vi.fn(() => {
			a.value;
			b.value;
		});
		effect(fn);
		expect(fn).toHaveBeenCalledTimes(1);
		batch(() => {
			a.value = 2;
			b.value = 3;
		});
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('diamond dependencies do not glitch (single recompute on read)', () => {
		const s = signal(1);
		let bRuns = 0;
		let cRuns = 0;
		let dRuns = 0;
		const b = computed(() => {
			bRuns++;
			return s.value + 1;
		});
		const c = computed(() => {
			cRuns++;
			return s.value + 2;
		});
		const d = computed(() => {
			dRuns++;
			return b.value + c.value;
		});

		expect(d.value).toBe(1 + 1 + 1 + 2);
		expect([bRuns, cRuns, dRuns]).toEqual([1, 1, 1]);

		s.value = 2;
		expect(d.value).toBe(2 + 1 + 2 + 2);
		expect([bRuns, cRuns, dRuns]).toEqual([2, 2, 2]);
	});

	it('computed circular dependency detection', () => {
		let a: any;
		let b: any;

		a = computed(() => b.value + 1);
		b = computed(() => a.value + 1);

		expect(() => a.value).toThrow(/Circular computed dependency detected/);
	});

	it('subscribe during notification is deferred until the next notification', () => {
		const s = signal(0);
		const seen1: number[] = [];
		const seen2: number[] = [];
		let unsub2: (() => void) | undefined;

		s.subscribe((v) => {
			seen1.push(v);
			if (!unsub2) {
				unsub2 = s.subscribe((v2) => {
					seen2.push(v2);
				});
			}
		});

		s.value = 1;
		// New subscriber should not be invoked in the same notify cycle.
		expect(seen1).toEqual([1]);
		expect(seen2).toEqual([]);

		s.value = 2;
		expect(seen1).toEqual([1, 2]);
		expect(seen2).toEqual([2]);

		unsub2?.();
	});

	it('unsubscribe during notification does not break iteration and prevents future notifications', () => {
		const s = signal(0);
		const seen: number[] = [];
		let unsub: (() => void) | undefined;

		unsub = s.subscribe((v) => {
			seen.push(v);
			unsub?.();
		});

		s.value = 1;
		s.value = 2;
		expect(seen).toEqual([1]);
	});

	it('observer add/remove during notification is deferred safely', () => {
		const s = signal(0) as any;
		const calls: string[] = [];

		const obs1 = {
			onDependencyChanged() {
				calls.push('obs1');
				s.addObserver(obs2);
			},
		};

		const obs2 = {
			onDependencyChanged() {
				calls.push('obs2');
				s.removeObserver(obs1);
			},
		};

		s.addObserver(obs1);
		s.value = 1;
		// Only obs1 is present at start of cycle.
		expect(calls).toEqual(['obs1']);

		s.value = 2;
		// obs2 was added after cycle 1, obs1 removed after obs2 ran.
		expect(calls).toEqual(['obs1', 'obs1', 'obs2']);
	});
});
