import { describe, it, expect } from 'vitest';
import { FilterCache } from '../cache.js';
import { compileFilterCached } from '../compiler.js';

describe('FilterCache', () => {
	it('reuses compiled filters by key', () => {
		const cache = new FilterCache(10);
		const a = compileFilterCached('@.a == 1', cache);
		const b = compileFilterCached('@.a == 1', cache);
		expect(a).toBe(b);
	});
});
