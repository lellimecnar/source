/**
 * @jsonpath/jsonpath
 *
 * Cache management for parsed and compiled queries.
 *
 * @packageDocumentation
 */

import type { QueryNode } from '@jsonpath/parser';
import type { CompiledQuery } from '@jsonpath/compiler';
import { Compiler } from '@jsonpath/compiler';

import { getConfig, configure } from './config.js';

// -----------------------------
// Parsed AST cache
// -----------------------------

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
		// Simple insertion-order eviction.
		const firstKey = queryCache.keys().next().value;
		if (firstKey !== undefined) {
			queryCache.delete(firstKey);
		}
	}

	queryCache.set(query, ast);
}

/**
 * Clears the parsed query cache.
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

// -----------------------------
// Compiled query cache
// -----------------------------

let compiler = createCompilerFromConfig();

function createCompilerFromConfig(): Compiler {
	const { compiledCache } = getConfig();
	// The Compiler requires `cacheSize > 0` when caching is enabled.
	// Interpret `maxSize = 0` as "disable compiled cache".
	const useCache = compiledCache.enabled && compiledCache.maxSize > 0;
	return new Compiler({
		useCache,
		cacheSize: useCache ? compiledCache.maxSize : 1,
	});
}

/**
 * Compile using the module-level compiler instance (enables real LRU).
 */
export function compileCachedQuery(ast: QueryNode): CompiledQuery {
	return compiler.compile(ast);
}

/**
 * Clears the compiled query cache.
 */
export function clearCompiledCache(): void {
	compiler = createCompilerFromConfig();
}

/**
 * Sets the compiled cache size and clears existing compiled cache.
 */
export function setCompiledCacheSize(size: number): void {
	if (!Number.isInteger(size) || size < 0) {
		throw new TypeError('compiled cache size must be a non-negative integer');
	}
	configure({ compiledCache: { maxSize: size } as any });
	compiler = createCompilerFromConfig();
}
