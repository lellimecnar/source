import { parse, type QueryNode } from '@jsonpath/parser';
import { evaluate, type QueryResult } from '@jsonpath/evaluator';
import { compile, type CompiledQuery } from '@jsonpath/compiler';
import { type EvaluatorOptions } from '@jsonpath/core';

/**
 * Cache for parsed queries.
 */
const queryCache = new Map<string, QueryNode>();

/**
 * Parses a JSONPath query string, with caching.
 */
export function parseQuery(query: string): QueryNode {
	let ast = queryCache.get(query);
	if (!ast) {
		ast = parse(query);
		queryCache.set(query, ast);
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
	const ast = parseQuery(path);
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
 * Executes a JSONPath query and returns only the paths.
 */
export function queryPaths(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): any[] {
	return query(root, path, options).paths();
}

/**
 * Compiles a JSONPath query string into an executable function.
 */
export function compileQuery(path: string): CompiledQuery {
	const ast = parseQuery(path);
	return compile(ast);
}

// Re-export core types and functions
export { parse } from '@jsonpath/parser';
export { evaluate } from '@jsonpath/evaluator';
export { compile } from '@jsonpath/compiler';
export { JSONPointer, evaluatePointer } from '@jsonpath/pointer';
export {
	JSONPathError,
	JSONPathSyntaxError,
	JSONPathTypeError,
} from '@jsonpath/core';
