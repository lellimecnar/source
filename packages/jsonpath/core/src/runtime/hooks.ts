import type { SelectorNode } from '@jsonpath/ast';

import type { JsonPathNode } from './node';

export type SelectorEvaluator = (
	input: JsonPathNode,
	selector: SelectorNode,
) => readonly JsonPathNode[];

export class EvaluatorRegistry {
	private readonly selectorEvaluators = new Map<string, SelectorEvaluator>();

	public registerSelector(kind: string, evaluator: SelectorEvaluator): void {
		this.selectorEvaluators.set(kind, evaluator);
	}

	public getSelector(kind: string): SelectorEvaluator | undefined {
		return this.selectorEvaluators.get(kind);
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
