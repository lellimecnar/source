/**
 * @jsonpath/jsonpath
 *
 * Security utilities for JSONPath.
 *
 * @packageDocumentation
 */

import { type EvaluatorOptions, type QueryResult } from '@jsonpath/core';

import { query } from './facade.js';

/**
 * Default security options for secureQuery.
 */
export const DEFAULT_SECURE_OPTIONS: EvaluatorOptions = {
	maxDepth: 20,
	maxResults: 1000,
	maxNodes: 10000,
	maxFilterDepth: 5,
	timeout: 1000,
	secure: {
		noRecursive: true,
		noFilters: false,
		maxQueryLength: 200,
	},
};

/**
 * Executes a JSONPath query with security restrictions.
 *
 * By default, it disables recursive descent and limits query length,
 * depth, and result size to prevent DoS attacks from untrusted queries.
 */
export function secureQuery(
	root: any,
	path: string,
	options: EvaluatorOptions = {},
): QueryResult {
	const secureOptions: EvaluatorOptions = {
		...DEFAULT_SECURE_OPTIONS,
		...options,
		secure: {
			...DEFAULT_SECURE_OPTIONS.secure,
			...options.secure,
		},
	};
	return query(root, path, secureOptions);
}
