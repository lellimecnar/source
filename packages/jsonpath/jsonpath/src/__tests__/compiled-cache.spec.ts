import { describe, it, expect, beforeEach } from 'vitest';

import {
	compileQuery,
	clearCompiledCache,
	setCompiledCacheSize,
	reset,
} from '../index.js';

describe('compiled query cache', () => {
	beforeEach(() => {
		reset();
		clearCompiledCache();
	});

	it('reuses the same compiled function for the same query', () => {
		const fn1 = compileQuery('$.a');
		const fn2 = compileQuery('$.a');
		expect(fn1).toBe(fn2);
	});

	it('clearCompiledCache() forces recompilation', () => {
		const fn1 = compileQuery('$.a');
		clearCompiledCache();
		const fn2 = compileQuery('$.a');
		expect(fn1).not.toBe(fn2);
	});

	it('setCompiledCacheSize() recreates cache (evicts prior entries)', () => {
		const fn1 = compileQuery('$.a');
		setCompiledCacheSize(1);
		const fn2 = compileQuery('$.a');
		expect(fn1).not.toBe(fn2);
	});

	it('evicts least-recently-used entries when cache is full', () => {
		setCompiledCacheSize(2);

		const a1 = compileQuery('$.a');
		const b1 = compileQuery('$.b');

		// Touch a (a becomes most-recently-used)
		const a2 = compileQuery('$.a');
		expect(a2).toBe(a1);

		// Add c; should evict b
		compileQuery('$.c');

		const a3 = compileQuery('$.a');
		expect(a3).toBe(a1);

		const b2 = compileQuery('$.b');
		expect(b2).not.toBe(b1);
	});
});
