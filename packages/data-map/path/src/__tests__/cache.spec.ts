import { describe, expect, it } from 'vitest';

import { QueryCache } from '../cache.js';

describe('QueryCache (LRU)', () => {
	it('returns undefined on miss', () => {
		const c = new QueryCache<number>(2);
		expect(c.get('x')).toBeUndefined();
	});

	it('returns value on hit and updates recency', () => {
		const c = new QueryCache<number>(2);
		c.set('a', 1);
		c.set('b', 2);
		expect(c.get('a')).toBe(1);

		// Accessing a makes b least-recently used.
		c.set('c', 3);
		expect(c.get('b')).toBeUndefined();
		expect(c.get('a')).toBe(1);
		expect(c.get('c')).toBe(3);
	});

	it('updates existing keys without growing size', () => {
		const c = new QueryCache<number>(2);
		c.set('a', 1);
		c.set('a', 2);
		expect(c.get('a')).toBe(2);
	});
});
