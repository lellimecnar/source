import type { EvaluatorOptions } from '@jsonpath/core';
import type { QueryResult } from '@jsonpath/evaluator';
import type { QueryNode } from '@jsonpath/parser';

export interface CompiledQuery {
	(root: unknown, options?: EvaluatorOptions): QueryResult;

	/** Generated JavaScript for the compiled query factory. */
	readonly source: string;
	/** Original parsed AST. */
	readonly ast: QueryNode;
	/** Time spent compiling (ms). */
	readonly compilationTime: number;
}
