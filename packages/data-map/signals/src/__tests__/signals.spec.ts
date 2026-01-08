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
});
