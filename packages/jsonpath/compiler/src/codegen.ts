/**
 * @jsonpath/compiler
 *
 * Code generator for JSONPath.
 *
 * @packageDocumentation
 */

import { NodeType, type QueryNode } from '@jsonpath/parser';

/**
 * Generates a JavaScript function body for a JSONPath query.
 */
export function generateCode(ast: QueryNode): string {
	// This is a very simplified code generator.
	// A real one would generate optimized loops for each segment.
	return `
    const { evaluate } = require('@jsonpath/evaluator');
    return (root, options) => evaluate(root, ast, options);
  `;
}
