import type { EvaluatorOptions } from '@jsonpath/core';

export const DEFAULT_EVALUATOR_OPTIONS: Required<
	Pick<
		EvaluatorOptions,
		'maxDepth' | 'maxResults' | 'timeout' | 'detectCircular'
	>
> & { secure: Required<SecureQueryOptions> } = {
	maxDepth: 256,
	maxResults: 10_000,
	timeout: 0,
	detectCircular: false,
	secure: {
		allowPaths: [],
		blockPaths: [],
		noRecursive: false,
		noFilters: false,
		maxQueryLength: 0,
	},
};

export function withDefaults(
	options?: EvaluatorOptions,
): Required<EvaluatorOptions> {
	return {
		...DEFAULT_EVALUATOR_OPTIONS,
		...options,
		secure: {
			...DEFAULT_EVALUATOR_OPTIONS.secure,
			...options?.secure,
		},
	} as Required<EvaluatorOptions>;
}
