import type { EvaluatorOptions } from '@jsonpath/core';

export const DEFAULT_EVALUATOR_OPTIONS: Required<
	Pick<
		EvaluatorOptions,
		'maxDepth' | 'maxResults' | 'timeout' | 'detectCircular'
	>
> = {
	maxDepth: 256,
	maxResults: 10_000,
	timeout: 0,
	detectCircular: false,
};

export function withDefaults(options?: EvaluatorOptions): EvaluatorOptions {
	return {
		...DEFAULT_EVALUATOR_OPTIONS,
		...options,
	};
}
