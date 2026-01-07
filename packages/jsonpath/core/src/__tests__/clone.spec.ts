import { describe, it, expect, vi } from 'vitest';
import { fastDeepClone } from '../clone.js';

describe('fastDeepClone', () => {
	it('returns primitives as-is', () => {
		expect(fastDeepClone(1)).toBe(1);
		expect(fastDeepClone('x')).toBe('x');
		expect(fastDeepClone(true)).toBe(true);
		expect(fastDeepClone(null)).toBe(null);
	});

	it('clones arrays and nested objects', () => {
		const input = { a: [1, { b: 2 }], c: 3 };
		const out = fastDeepClone(input);

		expect(out).toEqual(input);
		expect(out).not.toBe(input);
		expect(out.a).not.toBe(input.a);
		expect(out.a[1]).not.toBe(input.a[1]);
	});

	it('omits undefined object properties (JSON-shaped semantics)', () => {
		const input: any = { a: 1, b: undefined, c: { d: undefined, e: 2 } };
		const out: any = fastDeepClone(input);

		expect(out).toEqual({ a: 1, c: { e: 2 } });
	});

	it('does not call structuredClone', () => {
		const original = globalThis.structuredClone;
		const spy = vi.fn(() => {
			throw new Error('should not be called');
		});

		// @ts-expect-error test override
		globalThis.structuredClone = spy;

		try {
			const input = { a: [1, { b: 2 }] };
			const out = fastDeepClone(input);
			expect(out).toEqual(input);
			expect(spy).not.toHaveBeenCalled();
		} finally {
			// @ts-expect-error restore
			globalThis.structuredClone = original;
		}
	});
});
