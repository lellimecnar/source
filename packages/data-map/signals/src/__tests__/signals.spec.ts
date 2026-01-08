import { describe, expect, it, vi } from 'vitest';
import { batch, computed, effect, signal } from '../index.js';

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
});
