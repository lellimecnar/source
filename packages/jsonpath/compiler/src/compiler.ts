import { type EvaluatorOptions } from '@jsonpath/core';
import { evaluate } from '@jsonpath/evaluator';
import { type QueryNode } from '@jsonpath/parser';

import { LRUCache } from './cache.js';
import { generateCode } from './codegen.js';
import type { CompiledQuery } from './compiled-query.js';
import { defaultCompilerOptions, type CompilerOptions } from './options.js';

function executeInterpreted(
	root: unknown,
	ast: QueryNode,
	options?: EvaluatorOptions,
) {
	return evaluate(root, ast, options);
}

export class Compiler {
	private readonly options: Required<CompilerOptions>;
	private readonly cache: LRUCache;

	constructor(options: CompilerOptions = {}) {
		this.options = { ...defaultCompilerOptions, ...options };
		this.cache = new LRUCache(this.options.cacheSize);
	}

	compile(ast: QueryNode): CompiledQuery {
		const started = performance.now();
		const cacheKey = ast.source;

		if (this.options.useCache) {
			const cached = this.cache.get(cacheKey);
			if (cached) return cached;
		}

		const source = generateCode(ast);

		const fn = (root: unknown, options?: EvaluatorOptions) =>
			executeInterpreted(root, ast, options);

		const compiled: CompiledQuery = Object.assign(fn, {
			source,
			ast,
			compilationTime: performance.now() - started,
		});

		if (this.options.useCache) this.cache.set(cacheKey, compiled);
		return compiled;
	}
}

export function compile(
	ast: QueryNode,
	options: CompilerOptions = {},
): CompiledQuery {
	return new Compiler(options).compile(ast);
}
