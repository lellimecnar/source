import { type QueryNode } from '@jsonpath/parser';
import { evaluate, type QueryResult } from '@jsonpath/evaluator';
import { type EvaluatorOptions } from '@jsonpath/core';

/**
 * A compiled JSONPath query.
 */
export type CompiledQuery = (
	root: any,
	options?: EvaluatorOptions,
) => QueryResult;

/**
 * Compiles a JSONPath AST into an executable function.
 */
export function compile(ast: QueryNode): CompiledQuery {
	// For now, we just return a function that calls the evaluator.
	// In a more advanced implementation, we could generate a specialized
	// execution plan or even dynamic code.
	return (root: any, options?: EvaluatorOptions) =>
		evaluate(root, ast, options);
}
