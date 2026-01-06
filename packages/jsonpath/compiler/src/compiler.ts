import {
	type EvaluatorOptions,
	type PathSegment,
	Nothing,
} from '@jsonpath/core';
import {
	evaluate,
	QueryResult,
	type QueryResultNode,
} from '@jsonpath/evaluator';
import { getFunction } from '@jsonpath/functions';
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

type WildcardStep =
	| { kind: 'name'; name: string }
	| { kind: 'index'; index: number }
	| { kind: 'wildcard' };

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

/**
 * Check if AST is a wildcard chain (name, index, or wildcard selectors only).
 * Must have at least one wildcard to use this path.
 */
function isWildcardChainAst(ast: QueryNode): boolean {
	if (ast.type !== NodeType.Query || ast.segments.length === 0) return false;

	let hasWildcard = false;
	for (const seg of ast.segments) {
		if (seg.type !== NodeType.ChildSegment) return false;
		if (seg.selectors.length !== 1) return false;
		const sel = seg.selectors[0]!;
		if (
			sel.type !== NodeType.NameSelector &&
			sel.type !== NodeType.IndexSelector &&
			sel.type !== NodeType.WildcardSelector
		) {
			return false;
		}
		if (sel.type === NodeType.WildcardSelector) hasWildcard = true;
	}
	return hasWildcard;
}

/**
 * Check if AST is a simple recursive descent pattern like $..name or $..[index]
 * Single descendant segment with a single name or index selector.
 */
function isSimpleRecursiveAst(ast: QueryNode): boolean {
	if (ast.type !== NodeType.Query || ast.segments.length !== 1) return false;
	const seg = ast.segments[0]!;
	if (seg.type !== NodeType.DescendantSegment) return false;
	if (seg.selectors.length !== 1) return false;
	const sel = seg.selectors[0]!;
	return (
		sel.type === NodeType.NameSelector || sel.type === NodeType.IndexSelector
	);
}

/**
 * Compile a simple recursive descent query (e.g., $..author, $..[0]).
 * Uses stack-based iteration for maximum performance.
 */
function compileSimpleRecursiveQuery(
	ast: QueryNode,
): (root: unknown) => QueryResult {
	const seg = ast.segments[0]!;
	const sel = seg.selectors[0]!;

	if (sel.type === NodeType.NameSelector) {
		const targetName = sel.name;
		const hasOwn = Object.prototype.hasOwnProperty;

		return (root: unknown) => {
			const results: QueryResultNode[] = [];
			// Stack entries: [value, parent, parentKey, pathPrefix]
			type Frame = [unknown, unknown, PathSegment, PathSegment[]];
			const stack: Frame[] = [[root, undefined, '' as PathSegment, []]];

			while (stack.length > 0) {
				const [value, parent, parentKey, pathPrefix] = stack.pop()!;

				if (value !== null && typeof value === 'object') {
					if (Array.isArray(value)) {
						// Check if this array has the target property (unlikely for arrays but possible)
						// Then recurse into children
						for (let i = value.length - 1; i >= 0; i--) {
							const childPath = pathPrefix.slice();
							childPath.push(i);
							stack.push([value[i], value, i, childPath]);
						}
					} else {
						const obj = value as Record<string, unknown>;
						// Check if this object has the target property
						if (hasOwn.call(obj, targetName)) {
							const path = pathPrefix.slice();
							path.push(targetName);
							results.push({
								value: obj[targetName],
								path,
								root,
								parent: value,
								parentKey: targetName,
								_cachedPointer: undefined,
							} as QueryResultNode);
						}
						// Recurse into all properties
						const keys = Object.keys(obj);
						for (let i = keys.length - 1; i >= 0; i--) {
							const k = keys[i]!;
							const childPath = pathPrefix.slice();
							childPath.push(k);
							stack.push([obj[k], obj, k, childPath]);
						}
					}
				}
			}

			return new QueryResult(results);
		};
	}
	// Index selector
	const targetIndex = (
		sel as { type: typeof NodeType.IndexSelector; index: number }
	).index;

	return (root: unknown) => {
		const results: QueryResultNode[] = [];
		type Frame = [unknown, unknown, PathSegment, PathSegment[]];
		const stack: Frame[] = [[root, undefined, '' as PathSegment, []]];

		while (stack.length > 0) {
			const [value, parent, parentKey, pathPrefix] = stack.pop()!;

			if (value !== null && typeof value === 'object') {
				if (Array.isArray(value)) {
					// Check if array has the target index
					const idx =
						targetIndex < 0 ? value.length + targetIndex : targetIndex;
					if (idx >= 0 && idx < value.length) {
						const path = pathPrefix.slice();
						path.push(idx);
						results.push({
							value: value[idx],
							path,
							root,
							parent: value,
							parentKey: idx,
							_cachedPointer: undefined,
						} as QueryResultNode);
					}
					// Recurse into children
					for (let i = value.length - 1; i >= 0; i--) {
						const childPath = pathPrefix.slice();
						childPath.push(i);
						stack.push([value[i], value, i, childPath]);
					}
				} else {
					// Object - just recurse into all properties
					const obj = value as Record<string, unknown>;
					const keys = Object.keys(obj);
					for (let i = keys.length - 1; i >= 0; i--) {
						const k = keys[i]!;
						const childPath = pathPrefix.slice();
						childPath.push(k);
						stack.push([obj[k], obj, k, childPath]);
					}
				}
			}
		}

		return new QueryResult(results);
	};
}

function toWildcardSteps(ast: QueryNode): WildcardStep[] {
	const steps: WildcardStep[] = [];
	for (const seg of ast.segments) {
		const sel = seg.selectors[0]!;
		if (sel.type === NodeType.NameSelector) {
			steps.push({ kind: 'name', name: sel.name });
		} else if (sel.type === NodeType.IndexSelector) {
			steps.push({ kind: 'index', index: sel.index });
		} else {
			steps.push({ kind: 'wildcard' });
		}
	}
	return steps;
}

function toSimpleSteps(ast: QueryNode): SimpleStep[] {
	const steps: SimpleStep[] = [];
	for (const seg of ast.segments) {
		const sel = seg.selectors[0]!;
		if (sel.type === NodeType.NameSelector) {
			steps.push({ kind: 'name', name: sel.name });
		} else if (sel.type === NodeType.IndexSelector) {
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

/**
 * Compile a wildcard chain query (e.g., $.a[*].b, $[*].prop, $.a[*].b[*].c).
 * Uses code generation to inline all steps for maximum performance.
 */
function compileWildcardChainQuery(
	ast: QueryNode,
): (root: unknown) => QueryResult {
	const steps = toWildcardSteps(ast);

	// Generate an inline function body for maximum speed
	let code = `
	const results = [];
	const path = [];
	const hasOwn = Object.prototype.hasOwnProperty;
	let v0 = root;
	let p0 = undefined;
	let k0 = '';
	`;

	const depth = steps.length;

	for (let i = 0; i < depth; i++) {
		const step = steps[i]!;
		const vPrev = `v${i}`;
		const vCurr = `v${i + 1}`;
		const pCurr = `p${i + 1}`;
		const kCurr = `k${i + 1}`;

		if (step.kind === 'wildcard') {
			// Wildcard: loop over all keys/indices
			code += `
	if (Array.isArray(${vPrev})) {
		for (let i${i} = 0; i${i} < ${vPrev}.length; i${i}++) {
			const ${vCurr} = ${vPrev}[i${i}];
			const ${pCurr} = ${vPrev};
			const ${kCurr} = i${i};
			path.push(i${i});
`;
		} else if (step.kind === 'name') {
			// Named property access
			const nameStr = JSON.stringify(step.name);
			code += `
	if (${vPrev} !== null && typeof ${vPrev} === 'object' && !Array.isArray(${vPrev}) && hasOwn.call(${vPrev}, ${nameStr})) {
		const ${vCurr} = ${vPrev}[${nameStr}];
		const ${pCurr} = ${vPrev};
		const ${kCurr} = ${nameStr};
		path.push(${nameStr});
`;
		} else {
			// Index access
			const idx = step.index;
			if (idx >= 0) {
				code += `
	if (Array.isArray(${vPrev}) && ${idx} < ${vPrev}.length) {
		const ${vCurr} = ${vPrev}[${idx}];
		const ${pCurr} = ${vPrev};
		const ${kCurr} = ${idx};
		path.push(${idx});
`;
			} else {
				code += `
	if (Array.isArray(${vPrev})) {
		const idx${i} = ${vPrev}.length + ${idx};
		if (idx${i} >= 0) {
			const ${vCurr} = ${vPrev}[idx${i}];
			const ${pCurr} = ${vPrev};
			const ${kCurr} = idx${i};
			path.push(idx${i});
`;
			}
		}
	}

	// Emit result collection at innermost level
	const finalV = `v${depth}`;
	const finalP = `p${depth}`;
	const finalK = `k${depth}`;
	code += `
	results.push({
		value: ${finalV},
		path: path.slice(),
		root,
		parent: ${finalP},
		parentKey: ${finalK},
		_cachedPointer: undefined
	});
`;

	// Close all blocks with path.pop()
	for (let i = depth - 1; i >= 0; i--) {
		const step = steps[i]!;
		code += `
			path.pop();
		}`;

		// For object wildcards, need an extra closing block and loop
		if (step.kind === 'wildcard') {
			code += `
	} else if (v${i} !== null && typeof v${i} === 'object') {
		const keys${i} = Object.keys(v${i});
		for (let ki${i} = 0; ki${i} < keys${i}.length; ki${i}++) {
			const key${i} = keys${i}[ki${i}];
			const v${i + 1} = v${i}[key${i}];
			const p${i + 1} = v${i};
			const k${i + 1} = key${i};
			path.push(key${i});
`;
			// Re-inline all subsequent steps for object wildcard path
			for (let j = i + 1; j < depth; j++) {
				const s = steps[j]!;
				const vP = `v${j}`;
				const vC = `v${j + 1}_obj`;
				const pC = `p${j + 1}_obj`;
				const kC = `k${j + 1}_obj`;

				if (s.kind === 'wildcard') {
					code += `
			if (Array.isArray(${vP})) {
				for (let oi${j} = 0; oi${j} < ${vP}.length; oi${j}++) {
					const ${vC} = ${vP}[oi${j}];
					const ${pC} = ${vP};
					const ${kC} = oi${j};
					path.push(oi${j});
`;
				} else if (s.kind === 'name') {
					const nameStr = JSON.stringify(s.name);
					code += `
			if (${vP} !== null && typeof ${vP} === 'object' && !Array.isArray(${vP}) && hasOwn.call(${vP}, ${nameStr})) {
				const ${vC} = ${vP}[${nameStr}];
				const ${pC} = ${vP};
				const ${kC} = ${nameStr};
				path.push(${nameStr});
`;
				} else {
					// Simplified for now - positive index only in nested
					code += `
			if (Array.isArray(${vP}) && ${s.index} < ${vP}.length) {
				const ${vC} = ${vP}[${s.index}];
				const ${pC} = ${vP};
				const ${kC} = ${s.index};
				path.push(${s.index});
`;
				}
			}

			// Result for object path
			if (i < depth - 1) {
				const fV = `v${depth}_obj`;
				const fP = `p${depth}_obj`;
				const fK = `k${depth}_obj`;
				code += `
				results.push({
					value: ${fV},
					path: path.slice(),
					root,
					parent: ${fP},
					parentKey: ${fK},
					_cachedPointer: undefined
				});
`;
			} else {
				code += `
				results.push({
					value: v${depth},
					path: path.slice(),
					root,
					parent: p${depth},
					parentKey: k${depth},
					_cachedPointer: undefined
				});
`;
			}

			// Close nested blocks
			for (let j = depth - 1; j > i; j--) {
				code += `
					path.pop();
				}`;
				if (steps[j]!.kind === 'wildcard') {
					code += `
			} else if (v${j} !== null && typeof v${j} === 'object') { /* skip obj branch */ }`;
				}
			}

			code += `
			path.pop();
		}
	}`;
		}
	}

	code += `
	return new QueryResult(results);
`;

	// eslint-disable-next-line no-new-func
	const fn = new Function('root', 'QueryResult', code);

	return (root: unknown) => fn(root, QueryResult);
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

		// Try fast paths in order of specificity
		const simpleFast = isSimpleAst(ast) ? compileSimpleQuery(ast) : null;
		const wildcardFast =
			!simpleFast && isWildcardChainAst(ast)
				? compileWildcardChainQuery(ast)
				: null;
		const recursiveFast =
			!simpleFast && !wildcardFast && isSimpleRecursiveAst(ast)
				? compileSimpleRecursiveQuery(ast)
				: null;

		// If no specialized fast path, try to compile the generated code
		let generatedFn:
			| ((root: unknown, options?: EvaluatorOptions) => QueryResult)
			| null = null;
		if (!simpleFast && !wildcardFast && !recursiveFast) {
			try {
				// eslint-disable-next-line no-new-func
				const factory = new Function(
					'QueryResult',
					'evaluate',
					'getFunction',
					'Nothing',
					'ast',
					source,
				);
				generatedFn = factory(QueryResult, evaluate, getFunction, Nothing, ast);
			} catch {
				// If codegen fails, fall back to interpreter
				generatedFn = null;
			}
		}

		// Helper to check if options require interpreter features (limits, hooks, etc.)
		const requiresInterpreter = (options?: EvaluatorOptions): boolean => {
			if (!options) return false;
			// Check for limits that would constrain results
			if (options.maxDepth && options.maxDepth < ast.segments.length)
				return true;
			// maxResults below default threshold requires enforcement
			if (options.maxResults && options.maxResults < 10_000) return true;
			// Circular detection requires tracking
			if (options.detectCircular) return true;
			// Only check for plugins with evaluation hooks (not just function registrations)
			if (
				options.plugins?.some(
					(p) => p.beforeEvaluate || p.afterEvaluate || p.onError,
				)
			) {
				return true;
			}
			// Security options require interpreter for proper enforcement
			if (options.secure?.noRecursive || options.secure?.noFilters) return true;
			if (
				options.secure?.allowPaths?.length ||
				options.secure?.blockPaths?.length
			)
				return true;
			return false;
		};

		const fn = (root: unknown, options?: EvaluatorOptions) => {
			// If options require limit checking or hooks, use interpreter
			if (requiresInterpreter(options)) {
				return executeInterpreted(root, ast, options);
			}
			if (simpleFast) return simpleFast(root);
			if (wildcardFast) return wildcardFast(root);
			if (recursiveFast) return recursiveFast(root);
			if (generatedFn) return generatedFn(root, options);
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
