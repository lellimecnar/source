/**
 * @jsonpath/jsonpath
 *
 * Global configuration for the JSONPath suite.
 *
 * @packageDocumentation
 */

import type { EvaluatorOptions } from '@jsonpath/core';

export interface JSONPathConfig {
	evaluator: EvaluatorOptions;
	cache: {
		enabled: boolean;
		maxSize: number;
	};
}

const DEFAULT_CONFIG: JSONPathConfig = {
	evaluator: {
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
	},
	cache: {
		enabled: true,
		maxSize: 1000,
	},
};

let currentConfig: JSONPathConfig = { ...DEFAULT_CONFIG };

/**
 * Updates the global configuration.
 */
export function configure(options: Partial<JSONPathConfig>): void {
	currentConfig = {
		...currentConfig,
		...options,
		evaluator: {
			...currentConfig.evaluator,
			...options.evaluator,
		},
		cache: {
			...currentConfig.cache,
			...options.cache,
		},
	};
}

/**
 * Returns the current global configuration.
 */
export function getConfig(): Readonly<JSONPathConfig> {
	return currentConfig;
}

/**
 * Resets the global configuration to defaults.
 */
export function reset(): void {
	currentConfig = { ...DEFAULT_CONFIG };
}
