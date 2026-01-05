import { type EvaluatorOptions, Nothing, getFunction } from '@jsonpath/core';
import { evaluate, QueryResult } from '@jsonpath/evaluator';
import { type QueryNode } from '@jsonpath/parser';

import { LRUCache } from './cache.js';
import { generateCode } from './codegen.js';
import type { CompiledQuery } from './compiled-query.js';
import { defaultCompilerOptions, type CompilerOptions } from './options.js';

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

		const body = generateCode(ast);
		// Create a factory so we can inject dependencies.
		const factory = new Function(
			'QueryResult',
			'evaluate',
			'getFunction',
			'Nothing',
			'ast',
			body,
		) as (
			QueryResult: any,
			evaluate: any,
			getFunction: any,
			Nothing: any,
			ast: any,
		) => (root: unknown, options?: any) => any;

		const fn = factory(QueryResult, evaluate, getFunction, Nothing, ast);
		const compiled: CompiledQuery = Object.assign(fn, {
			source: body,
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
