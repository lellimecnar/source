import { compileQuery } from '@jsonpath/jsonpath';

import { QueryCache } from './cache.js';

// CompiledQuery is the return type of compileQuery
type CompiledQuery = ReturnType<typeof compileQuery>;

const cache = new QueryCache<CompiledQuery>(500);

export function compile(path: string): CompiledQuery {
	const hit = cache.get(path);
	if (hit) return hit;
	const compiled = compileQuery(path);
	cache.set(path, compiled);
	return compiled;
}
