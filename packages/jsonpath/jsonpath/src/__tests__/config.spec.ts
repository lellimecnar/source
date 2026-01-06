import { describe, it, expect, beforeEach } from 'vitest';
import { configure, getConfig, reset } from '../config.js';
import {
	clearCache,
	getCacheStats,
	getCachedQuery,
	setCachedQuery,
} from '../cache.js';

describe('Configuration & Cache', () => {
	beforeEach(() => {
		reset();
		clearCache();
	});

	it('should update and persist configuration', () => {
		configure({ cache: { maxSize: 500, enabled: false } });
		const config = getConfig();
		expect(config.cache.maxSize).toBe(500);
		expect(config.cache.enabled).toBe(false);
	});

	it('should reset to defaults', () => {
		configure({ cache: { maxSize: 500 } });
		reset();
		expect(getConfig().cache.maxSize).toBe(1000);
		expect(getConfig().compiledCache.enabled).toBe(true);
		expect(getConfig().compiledCache.maxSize).toBe(256);
	});

	it('should track cache hits and misses', () => {
		const query = '$.a';
		const ast = { type: 'root' } as any;

		getCachedQuery(query); // Miss
		setCachedQuery(query, ast);
		getCachedQuery(query); // Hit
		getCachedQuery(query); // Hit

		const stats = getCacheStats();
		expect(stats.size).toBe(1);
		expect(stats.hits).toBe(2);
		expect(stats.misses).toBe(1);
	});

	it('should clear cache and reset stats', () => {
		setCachedQuery('$.a', {} as any);
		clearCache();
		const stats = getCacheStats();
		expect(stats.size).toBe(0);
		expect(stats.hits).toBe(0);
		expect(stats.misses).toBe(0);
	});
});
