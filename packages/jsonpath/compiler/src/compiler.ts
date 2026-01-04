import { type EvaluatorOptions } from '@jsonpath/core';
import { evaluate, type QueryResult } from '@jsonpath/evaluator';
import { type QueryNode } from '@jsonpath/parser';

/**
 * A compiled JSONPath query.
 */
export type CompiledQuery = (
	root: any,
	options?: EvaluatorOptions,
) => QueryResult;

export interface CompilerOptions {
	readonly useCache?: boolean;
	readonly optimize?: boolean;
}

/**
 * Compiles a JSONPath AST into an executable function.
 */
export function compile(
	ast: QueryNode,
	options: CompilerOptions = {},
): CompiledQuery {
	return (root: any, evalOptions?: EvaluatorOptions) =>
		evaluate(root, ast, evalOptions);
}
