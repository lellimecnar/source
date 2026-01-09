import { describe, expect, it } from 'vitest';

import { mutativeImmutableAdapter } from './immutable.mutative.js';

describe('mutativeImmutableAdapter', () => {
	it('should pass smoke test', () => {
		expect(mutativeImmutableAdapter.smokeTest()).toBe(true);
	});

	it('should not mutate original object', () => {
		const base = { a: { b: 1 }, c: 2 };
		const next = mutativeImmutableAdapter.produce(base, (d) => {
			d.set('/a/b', 99);
		}) as typeof base;

		expect(base.a.b).toBe(1);
		expect(next.a.b).toBe(99);
		expect(next).not.toBe(base);
	});

	it('should support deep updates', () => {
		const base = { deep: { nested: { value: 'original' } } };
		const next = mutativeImmutableAdapter.produce(base, (d) => {
			d.set('/deep/nested/value', 'updated');
		}) as typeof base;

		expect(next.deep.nested.value).toBe('updated');
		expect(base.deep.nested.value).toBe('original');
	});

	it('should support delete operations', () => {
		const base = { a: 1, b: 2 };
		const next = mutativeImmutableAdapter.produce(base, (d) => {
			d.del('/b');
		}) as Partial<typeof base>;

		expect(next.a).toBe(1);
		expect(next.b).toBeUndefined();
		expect(base.b).toBe(2);
	});

	it('should support array operations', () => {
		const base = { arr: [1, 2, 3] };
		const next = mutativeImmutableAdapter.produce(base, (d) => {
			d.set('/arr/1', 99);
		}) as typeof base;

		expect(next.arr).toEqual([1, 99, 3]);
		expect(base.arr).toEqual([1, 2, 3]);
	});
});
