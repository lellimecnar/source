import { describe, expect, it } from 'vitest';
import { pointerComputed } from '../pointer-computed.js';

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
});
