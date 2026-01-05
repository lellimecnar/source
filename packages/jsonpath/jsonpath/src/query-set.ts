/**
 * @jsonpath/jsonpath
 *
 * QuerySet for reusable multi-query execution.
 *
 * @packageDocumentation
 */

import { type QueryResult } from '@jsonpath/evaluator';
import { query } from './facade.js';
import { type EvaluatorOptions } from '@jsonpath/core';

/**
 * A reusable set of JSONPath queries.
 */
export class QuerySet {
	private queries = new Map<string, string>();

	constructor(
		queries?: Array<{ name: string; path: string }> | Record<string, string>,
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
		const results: Record<string, QueryResult> = {};
		for (const [name, path] of this.queries.entries()) {
			results[name] = query(data, path, options);
		}
		return results;
	}
}

/**
 * Creates a new QuerySet.
 */
export function createQuerySet(
	queries?: Array<{ name: string; path: string }> | Record<string, string>,
): QuerySet {
	return new QuerySet(queries);
}
