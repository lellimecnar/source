import type { SegmentNode, SelectorNode } from '@jsonpath/ast';

import type { JsonPathNode } from './node';

export interface EvalContext {
	root: JsonPathNode;
}

export type SelectorEvaluator = (
	input: JsonPathNode,
	selector: SelectorNode,
	ctx: EvalContext,
) => readonly JsonPathNode[];

export type SegmentEvaluator = (
	inputs: readonly JsonPathNode[],
	segment: SegmentNode,
	evaluators: EvaluatorRegistry,
	ctx: EvalContext,
) => readonly JsonPathNode[];

export class EvaluatorRegistry {
	private readonly selectorEvaluators = new Map<string, SelectorEvaluator>();
	private readonly segmentEvaluators = new Map<string, SegmentEvaluator>();

	public registerSelector(kind: string, evaluator: SelectorEvaluator): void {
		this.selectorEvaluators.set(kind, evaluator);
	}

	public getSelector(kind: string): SelectorEvaluator | undefined {
		return this.selectorEvaluators.get(kind);
	}

	public registerSegment(kind: string, evaluator: SegmentEvaluator): void {
		this.segmentEvaluators.set(kind, evaluator);
	}

	public getSegment(kind: string): SegmentEvaluator | undefined {
		return this.segmentEvaluators.get(kind);
	}
}

export type ResultType = 'value' | 'node' | 'path' | 'pointer' | 'parent';

export type ResultMapper = (nodes: readonly JsonPathNode[]) => unknown[];

export class ResultRegistry {
	private readonly mappers = new Map<ResultType, ResultMapper>();

	public register(type: ResultType, mapper: ResultMapper): void {
		this.mappers.set(type, mapper);
	}

	public get(type: ResultType): ResultMapper | undefined {
		return this.mappers.get(type);
	}
}
