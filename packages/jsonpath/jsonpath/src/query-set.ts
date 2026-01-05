/**
 * @jsonpath/jsonpath
 *
 * QuerySet for reusable multi-query execution.
 *
 * @packageDocumentation
 */

import { type EvaluatorOptions } from '@jsonpath/core';
import { type QueryResult } from '@jsonpath/evaluator';

import { query } from './facade.js';

/**
 * A reusable set of JSONPath queries.
 */
export class QuerySet {
	private queries = new Map<string, string>();

	constructor(
		queries?: { name: string; path: string }[] | Record<string, string>,
	) {
		if (Array.isArray(queries)) {
			for (const { name, path } of queries) {
				this.queries.set(name, path);
			}
		} else if (queries) {
			for (const [name, path] of Object.entries(queries)) {
				this.queries.set(name, path);
			}
		}
	}

	/**
	 * Adds a query to the set.
	 */
	add(name: string, path: string): this {
		this.queries.set(name, path);
		return this;
	}

	/**
	 * Removes a query from the set.
	 */
	remove(name: string): boolean {
		return this.queries.delete(name);
	}

	/**
	 * Returns the names of all queries in the set.
	 */
	get names(): string[] {
		return Array.from(this.queries.keys());
	}

	/**
	 * Executes all queries in the set against the given data.
	 */
	execute(
		data: unknown,
		options?: EvaluatorOptions,
	): Record<string, QueryResult> {
		return this.queryAll(data, options);
	}

	/**
	 * Executes all queries and returns a map of QueryResults.
	 */
	queryAll(
		data: unknown,
		options?: EvaluatorOptions,
	): Record<string, QueryResult> {
		const results: Record<string, QueryResult> = {};
		for (const [name, path] of this.queries.entries()) {
			results[name] = query(data, path, options);
		}
		return results;
	}

	/**
	 * Executes all queries and returns a map of values.
	 */
	valuesAll(data: unknown, options?: EvaluatorOptions): Record<string, any[]> {
		const results: Record<string, any[]> = {};
		for (const [name, path] of this.queries.entries()) {
			results[name] = query(data, path, options).values();
		}
		return results;
	}

	/**
	 * Executes all queries and returns a map of pointer strings.
	 */
	pointersAll(
		data: unknown,
		options?: EvaluatorOptions,
	): Record<string, string[]> {
		const results: Record<string, string[]> = {};
		for (const [name, path] of this.queries.entries()) {
			results[name] = query(data, path, options).pointers();
		}
		return results;
	}

	/**
	 * Executes all queries and returns a map of paths (segment arrays).
	 */
	pathsAll(data: unknown, options?: EvaluatorOptions): Record<string, any[][]> {
		const results: Record<string, any[][]> = {};
		for (const [name, path] of this.queries.entries()) {
			results[name] = query(data, path, options).paths();
		}
		return results;
	}

	/**
	 * Executes all queries and returns a map of RFC 9535 normalized paths.
	 */
	normalizedPathsAll(
		data: unknown,
		options?: EvaluatorOptions,
	): Record<string, string[]> {
		const results: Record<string, string[]> = {};
		for (const [name, path] of this.queries.entries()) {
			results[name] = query(data, path, options).normalizedPaths();
		}
		return results;
	}
}

/**
 * Creates a new QuerySet.
 */
export function createQuerySet(
	queries?: { name: string; path: string }[] | Record<string, string>,
): QuerySet {
	return new QuerySet(queries);
}
