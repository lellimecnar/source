/**
 * @jsonpath/jsonpath
 *
 * Multi-query execution for JSONPath.
 *
 * @packageDocumentation
 */

import { type QueryResult } from '@jsonpath/evaluator';
import { query } from './facade.js';
import { type EvaluatorOptions } from '@jsonpath/core';

/**
 * Executes multiple JSONPath queries against the same data.
 *
 * @param data - The data to query.
 * @param queries - An array of query strings or a record of name -> query string.
 * @param options - Evaluator options.
 * @returns A Map or Record of results.
 */
export function multiQuery(
	data: unknown,
	queries: string[] | Record<string, string>,
	options?: EvaluatorOptions,
): Map<string, QueryResult> | Record<string, QueryResult> {
	if (Array.isArray(queries)) {
		const results = new Map<string, QueryResult>();
		for (const q of queries) {
			results.set(q, query(data, q, options));
		}
		return results;
	}

	const results: Record<string, QueryResult> = {};
	for (const [name, q] of Object.entries(queries)) {
		results[name] = query(data, q, options);
	}
	return results;
}
