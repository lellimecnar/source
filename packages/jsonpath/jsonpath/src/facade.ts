import { compile, type CompiledQuery } from '@jsonpath/compiler';
import { type EvaluatorOptions, JSONPathSecurityError } from '@jsonpath/core';
import { evaluate, type QueryResult } from '@jsonpath/evaluator';
import { parse, type QueryNode } from '@jsonpath/parser';
import { evaluatePointer } from '@jsonpath/pointer';
import { applyPatch } from '@jsonpath/patch';
import { applyMergePatch } from '@jsonpath/merge-patch';

import { getCachedQuery, setCachedQuery } from './cache.js';

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
		ast = parse(query);
		setCachedQuery(query, ast);
	}
	return ast;
}

/**
 * Executes a JSONPath query against a root object.
 */
export function query(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): QueryResult {
	const ast = parseQuery(path, options);
	return evaluate(root, ast, options);
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
	return compile(ast);
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
	return query(root, path, options).pointerStrings()[0];
}

/**
 * Executes a JSONPath query and returns all matches as JSON Pointer strings.
 */
export function toPointers(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): string[] {
	return query(root, path, options).pointerStrings();
}

/**
 * Executes a JSONPath query and returns an iterator of results.
 */
export function* stream(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): IterableIterator<{ value: any; path: string }> {
	const results = query(root, path, options);
	for (let i = 0; i < results.length; i++) {
		yield {
			value: results.values()[i],
			path: results.normalizedPaths()[i]!,
		};
	}
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
export function patch(target: any, operations: any[]): any {
	return applyPatch(target, operations);
}

/**
 * Applies a JSON Merge Patch to a target object.
 */
export function mergePatch(target: any, patchDoc: any): any {
	return applyMergePatch(target, patchDoc);
}

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
