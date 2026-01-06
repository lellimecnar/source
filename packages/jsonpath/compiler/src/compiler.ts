import { type EvaluatorOptions, type PathSegment } from '@jsonpath/core';
import {
	evaluate,
	QueryResult,
	type QueryResultNode,
} from '@jsonpath/evaluator';
import { NodeType, type QueryNode } from '@jsonpath/parser';

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

type SimpleStep =
	| { kind: 'name'; name: string }
	| { kind: 'index'; index: number };

function isSimpleAst(ast: QueryNode): ast is QueryNode {
	return (
		ast.type === NodeType.Query &&
		ast.segments.length > 0 &&
		ast.segments.every(
			(seg) =>
				seg.type === NodeType.ChildSegment &&
				seg.selectors.length === 1 &&
				(seg.selectors[0]!.type === NodeType.NameSelector ||
					seg.selectors[0]!.type === NodeType.IndexSelector),
		)
	);
}

function toSimpleSteps(ast: QueryNode): SimpleStep[] {
	const steps: SimpleStep[] = [];
	for (const seg of ast.segments) {
		const sel = seg.selectors[0]!;
		if (sel.type === NodeType.NameSelector) {
			steps.push({ kind: 'name', name: sel.name });
		} else {
			steps.push({ kind: 'index', index: sel.index });
		}
	}
	return steps;
}

function escapeJsonPointerSegment(segment: PathSegment): string {
	return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

function pointerStringFromPath(path: readonly PathSegment[]): string {
	let out = '';
	for (const s of path) out += `/${escapeJsonPointerSegment(s)}`;
	return out;
}

function compileSimpleQuery(ast: QueryNode): (root: unknown) => QueryResult {
	const steps = toSimpleSteps(ast);

	return (root: unknown) => {
		let current: any = root;
		let parent: any;
		let parentKey: any;
		const path: PathSegment[] = [];

		for (const step of steps) {
			if (step.kind === 'name') {
				if (
					current !== null &&
					typeof current === 'object' &&
					!Array.isArray(current) &&
					Object.prototype.hasOwnProperty.call(current, step.name)
				) {
					parent = current;
					parentKey = step.name;
					current = current[step.name];
					path.push(step.name);
					continue;
				}
				return new QueryResult([]);
			}

			// index
			if (!Array.isArray(current)) return new QueryResult([]);
			const idx = step.index < 0 ? current.length + step.index : step.index;
			if (idx < 0 || idx >= current.length) return new QueryResult([]);
			parent = current;
			parentKey = idx;
			current = current[idx];
			path.push(idx);
		}

		const node: QueryResultNode = {
			value: current,
			path,
			root,
			parent,
			parentKey,
			_cachedPointer: pointerStringFromPath(path),
		};

		return new QueryResult([node]);
	};
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

		const fast = isSimpleAst(ast) ? compileSimpleQuery(ast) : null;

		const fn = (root: unknown, options?: EvaluatorOptions) => {
			if (fast) return fast(root);
			return executeInterpreted(root, ast, options);
		};

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
