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

/**
 * Returns a cached AST for a query string, or undefined if not cached.
 */
export function getCachedQuery(query: string): QueryNode | undefined {
	return queryCache.get(query);
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
}

/**
 * Returns cache statistics.
 */
export function getCacheStats(): { size: number; maxSize: number } {
	return {
		size: queryCache.size,
		maxSize: getConfig().cache.maxSize,
	};
}
