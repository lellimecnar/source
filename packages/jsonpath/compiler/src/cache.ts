/**
 * @jsonpath/compiler
 *
 * Cache for compiled queries.
 *
 * @packageDocumentation
 */

import type { CompiledQuery } from './compiler.js';

const compiledCache = new Map<string, CompiledQuery>();

export function getCompiledQuery(query: string): CompiledQuery | undefined {
	return compiledCache.get(query);
}

export function setCompiledQuery(query: string, compiled: CompiledQuery): void {
	if (compiledCache.size >= 1000) {
		const firstKey = compiledCache.keys().next().value;
		if (firstKey !== undefined) {
			compiledCache.delete(firstKey);
		}
	}
	compiledCache.set(query, compiled);
}
