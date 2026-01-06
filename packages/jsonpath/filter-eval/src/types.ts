import type { Path, PathSegment } from '@jsonpath/core';
import type { EvaluatorOptions } from '@jsonpath/core';

export type ValueType = unknown;

export interface LogicalType {
	readonly __isLogicalType: true;
	readonly value: boolean;
}

export interface FunctionResult {
	readonly __isFunctionResult: true;
	readonly value: unknown;
}

export interface NodesType<TNode = unknown> {
	readonly __isNodeList: true;
	readonly nodes: readonly TNode[];
}

export interface EvaluationNode<T = unknown> {
	readonly value: T;
	readonly path: Path;
	readonly root: unknown;
	readonly parent?: unknown;
	readonly parentKey?: PathSegment;
}

export interface EvaluationContext {
	readonly root: unknown;
	readonly current: EvaluationNode;
	readonly options?: EvaluatorOptions;
}

export interface EvaluatorOptionsLike {
	readonly maxDepth?: number;
	readonly maxFilterDepth?: number;
	readonly timeout?: number;
	readonly unsafe?: boolean;
}

export type CompiledFilter = (ctx: EvaluationContext) => boolean;
