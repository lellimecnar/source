/**
 * @jsonpath/compiler
 *
 * Code generator for JSONPath.
 *
 * @packageDocumentation
 */

import type { QueryNode } from '@jsonpath/parser';

import { generateQueryFunctionSource } from './codegen/generators.js';

/**
 * Generates a JavaScript function body for a JSONPath query.
 */
export function generateCode(ast: QueryNode): string {
	return generateQueryFunctionSource(ast);
}
