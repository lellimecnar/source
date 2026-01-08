import { describe, expect, it } from 'vitest';
import { multiPointerComputed } from '../multi-pointer-computed.js';
import { pointerComputed } from '../pointer-computed.js';
import { SignalCache } from '../signal-cache.js';

describe('@data-map/computed', () => {
	it('pointerComputed invalidates on dependency callback', () => {
		let value = 1;
		let invalidate: (() => void) | undefined;
		const host = {
			get: () => value,
			subscribePointer: (_p: string, cb: () => void) => {
				invalidate = cb;
				return () => {};
			},
			queryPointers: () => [],
			subscribePattern: () => () => {},
		};

		const { computed: c } = pointerComputed<number>(host, '/x');
		expect(c.value).toBe(1);
		value = 2;
		invalidate?.();
		expect(c.value).toBe(2);
	});

	it('multiPointerComputed combines multiple pointers', () => {
		let a = 1;
		let b = 2;
		const invalidates: Record<string, () => void> = {};

		const host = {
			get: (p: string) => (p === '/a' ? a : b),
			subscribePointer: (p: string, cb: () => void) => {
				invalidates[p] = cb;
				return () => {};
			},
			queryPointers: () => [],
			subscribePattern: () => () => {},
		};

		const { computed: c } = multiPointerComputed(
			host,
			['/a', '/b'],
			(av, bv) => {
				return Number(av) + Number(bv);
			},
		);
		expect(c.value).toBe(3);
		a = 10;
		invalidates['/a']?.();
		expect(c.value).toBe(12);
	});

	it('SignalCache caches signalFor(pointer)', () => {
		let x = 1;
		let invalidate: (() => void) | undefined;
		const host = {
			get: (_p: string) => x,
			subscribePointer: (_p: string, cb: () => void) => {
				invalidate = cb;
				return () => {};
			},
			queryPointers: () => [],
			subscribePattern: () => () => {},
		};

		const cache = new SignalCache(host);
		const s1 = cache.signalFor('/x');
		const s2 = cache.signalFor('/x');
		expect(s1).toBe(s2);
		expect(s1.value).toBe(1);
		x = 2;
		invalidate?.();
		expect(s1.value).toBe(2);
		cache.clearCache();
	});
});
