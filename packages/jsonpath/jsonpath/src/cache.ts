/**
 * @jsonpath/jsonpath
 *
 * Cache management for parsed queries.
 *
 * @packageDocumentation
 */

import type { QueryNode } from '@jsonpath/parser';

import { getConfig } from './config.js';

const queryCache = new Map<string, QueryNode>();
let hits = 0;
let misses = 0;

/**
 * Returns a cached AST for a query string, or undefined if not cached.
 */
export function getCachedQuery(query: string): QueryNode | undefined {
	const ast = queryCache.get(query);
	if (ast) {
		hits++;
	} else {
		misses++;
	}
	return ast;
}

/**
 * Caches an AST for a query string.
 */
export function setCachedQuery(query: string, ast: QueryNode): void {
	const config = getConfig();
	if (!config.cache.enabled) return;

	if (queryCache.size >= config.cache.maxSize) {
		// Simple LRU: clear the first entry
		const firstKey = queryCache.keys().next().value;
		if (firstKey !== undefined) {
			queryCache.delete(firstKey);
		}
	}

	queryCache.set(query, ast);
}

/**
 * Clears the query cache.
 */
export function clearCache(): void {
	queryCache.clear();
	hits = 0;
	misses = 0;
}

/**
 * Returns cache statistics.
 */
export function getCacheStats(): {
	size: number;
	maxSize: number;
	hits: number;
	misses: number;
} {
	return {
		size: queryCache.size,
		maxSize: getConfig().cache.maxSize,
		hits,
		misses,
	};
}
