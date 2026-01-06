import type { CompiledQuery } from '@jsonpath/compiler';
import {
	type EvaluatorOptions,
	JSONPathSecurityError,
	PluginManager,
	type JSONPathPlugin,
} from '@jsonpath/core';
import {
	evaluate,
	stream as evaluatorStream,
	type QueryResult,
	Evaluator,
	type QueryResultNode,
} from '@jsonpath/evaluator';
import { applyMergePatch } from '@jsonpath/merge-patch';
import { parse, type QueryNode } from '@jsonpath/parser';
import { applyPatch, type ApplyOptions } from '@jsonpath/patch';
import { arithmetic } from '@jsonpath/plugin-arithmetic';
import { extras } from '@jsonpath/plugin-extras';
import { evaluatePointer } from '@jsonpath/pointer';

import {
	getCachedQuery,
	setCachedQuery,
	compileCachedQuery,
	clearCompiledCache,
	setCompiledCacheSize,
} from './cache.js';

/**
 * Default plugins registered by the facade.
 */
export const DEFAULT_PLUGINS: JSONPathPlugin[] = [arithmetic(), extras()];

// Register default plugins globally for the parser to see them
PluginManager.from({ plugins: DEFAULT_PLUGINS });

/**
 * Registers a plugin globally.
 */
export function registerPlugin(plugin: JSONPathPlugin): void {
	DEFAULT_PLUGINS.push(plugin);
	PluginManager.from({ plugins: DEFAULT_PLUGINS });
}

/**
 * Parses a JSONPath query string, with caching.
 */
export function parseQuery(
	query: string,
	options?: EvaluatorOptions,
): QueryNode {
	if (
		options?.secure?.maxQueryLength &&
		query.length > options.secure.maxQueryLength
	) {
		throw new JSONPathSecurityError(
			`Query length exceeds maximum: ${options.secure.maxQueryLength}`,
		);
	}
	let ast = getCachedQuery(query);
	if (!ast) {
		ast = parse(query, {
			arithmetic: options?.arithmetic ?? true, // Default to true in facade
			strict: options?.strict,
		});
		setCachedQuery(query, ast);
	}
	return ast;
}

/**
 * Merges user options with default plugins.
 */
function withDefaultPlugins(options?: EvaluatorOptions): EvaluatorOptions {
	return {
		...options,
		plugins: [...DEFAULT_PLUGINS, ...(options?.plugins ?? [])],
	};
}

/**
 * Executes a JSONPath query against a root object.
 */
export function query(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): QueryResult {
	const compiled = compileQuery(path, options);
	return compiled(root, withDefaultPlugins(options));
}

/**
 * Executes a JSONPath query and returns only the values.
 */
export function queryValues(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): any[] {
	return query(root, path, options).values();
}

/**
 * Executes a JSONPath query and returns only the normalized paths (strings).
 */
export function queryPaths(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): string[] {
	return query(root, path, options).normalizedPaths();
}

/**
 * Compiles a JSONPath query string into an executable function.
 */
export function compileQuery(
	path: string,
	options?: EvaluatorOptions,
): CompiledQuery {
	const ast = parseQuery(path, options);
	return compileCachedQuery(ast);
}

/**
 * Executes a JSONPath query and returns the first match value.
 */
export function value(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): any | undefined {
	return query(root, path, options).values()[0];
}

/**
 * Alias for value().
 */
export const first = value;

/**
 * Executes a JSONPath query and returns true if any matches exist.
 */
export function exists(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): boolean {
	return !query(root, path, options).isEmpty();
}

/**
 * Executes a JSONPath query and returns the number of matches.
 */
export function count(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): number {
	return query(root, path, options).length;
}

/**
 * Executes a JSONPath query and returns the first match as a JSON Pointer string.
 */
export function toPointer(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): string | undefined {
	return query(root, path, options).pointers()[0]?.toString();
}

/**
 * Returns all JSON Pointers for matches of a JSONPath.
 */
export function toPointers(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): string[] {
	return query(root, path, options)
		.pointers()
		.map((p) => p.toString());
}

/**
 * Executes a JSONPath query and returns an iterator of results.
 */
export function* stream(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): Generator<QueryResultNode> {
	const ast = parseQuery(path, options);
	yield* evaluatorStream(root, ast, withDefaultPlugins(options));
}

/**
 * Alias for query().
 */
export const match = query;

/**
 * Validates a JSONPath query string.
 */
export function validateQuery(path: string): {
	valid: boolean;
	error?: string;
} {
	try {
		parse(path);
		return { valid: true };
	} catch (err: any) {
		return { valid: false, error: err.message };
	}
}

/**
 * Evaluates a JSON Pointer against a root object.
 */
export function pointer(root: any, ptr: string): any {
	return evaluatePointer(root, ptr);
}

/**
 * Applies a JSON Patch to a target object.
 */
export function patch(
	target: any,
	operations: any[],
	options?: ApplyOptions,
): any {
	return applyPatch(target, operations, options);
}

/**
 * Applies a JSON Merge Patch to a target object.
 */
export function mergePatch(target: any, patchDoc: any): any {
	return applyMergePatch(target, patchDoc);
}

export {
	transform,
	transformAll,
	project,
	projectWith,
	pick,
} from './transform.js';

// Re-export compiled cache management from the facade (public API)
export { clearCompiledCache, setCompiledCacheSize };

// Re-export core types and functions
export { parse } from '@jsonpath/parser';
export { evaluate } from '@jsonpath/evaluator';
export { compile } from '@jsonpath/compiler';
export {
	JSONPointer,
	RelativeJSONPointer,
	evaluatePointer,
} from '@jsonpath/pointer';
export { applyPatch, applyPatchImmutable } from '@jsonpath/patch';
export { applyMergePatch, createMergePatch } from '@jsonpath/merge-patch';
export {
	JSONPathError,
	JSONPathSyntaxError,
	JSONPathTypeError,
} from '@jsonpath/core';
