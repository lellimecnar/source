import type { EvaluatorOptions, SecureQueryOptions } from '@jsonpath/core';

// Stable empty arrays for default options
const STABLE_EMPTY_ALLOW_PATHS: readonly string[] = [];
const STABLE_EMPTY_BLOCK_PATHS: readonly string[] = [];
const STABLE_EMPTY_PLUGINS: readonly any[] = [];

// Singleton AbortSignal for default case
const NOOP_SIGNAL: AbortSignal = new AbortController().signal;

export const DEFAULT_EVALUATOR_OPTIONS: Required<
	Pick<
		EvaluatorOptions,
		| 'maxDepth'
		| 'maxResults'
		| 'maxNodes'
		| 'maxFilterDepth'
		| 'timeout'
		| 'detectCircular'
	>
> & { secure: Required<SecureQueryOptions> } = {
	maxDepth: 256,
	maxResults: 10_000,
	maxNodes: 100_000,
	maxFilterDepth: 16,
	timeout: 0,
	detectCircular: false,
	secure: {
		allowPaths: STABLE_EMPTY_ALLOW_PATHS as any,
		blockPaths: STABLE_EMPTY_BLOCK_PATHS as any,
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
		signal: options?.signal ?? NOOP_SIGNAL,
		plugins: options?.plugins ?? STABLE_EMPTY_PLUGINS,
		...options,
		secure: {
			...DEFAULT_EVALUATOR_OPTIONS.secure,
			...options?.secure,
		},
	} as Required<EvaluatorOptions>;
}
