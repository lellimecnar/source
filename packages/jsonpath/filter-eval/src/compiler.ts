import type { FilterCache } from './cache.js';
import { FilterEvaluator } from './evaluator.js';
import { parseFilter } from './parser.js';
import type { CompiledFilter } from './types.js';

export function compileFilter(
	expression: string,
	options?: { maxDepth?: number },
): CompiledFilter {
	const ast = parseFilter(expression);
	const evaluator = new FilterEvaluator({ maxDepth: options?.maxDepth });
	return evaluator.compile(ast);
}

export function compileFilterCached(
	expression: string,
	cache: FilterCache,
	options?: { maxDepth?: number },
): CompiledFilter {
	const existing = cache.get(expression);
	if (existing) return existing;
	const compiled = compileFilter(expression, options);
	cache.set(expression, compiled);
	return compiled;
}
