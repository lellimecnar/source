import type { QueryNode } from '@jsonpath/parser';

export interface OptimizationFlags {
	readonly inlineSimpleSelectors?: boolean;
	readonly shortCircuitFilters?: boolean;
}

export function detectOptimizations(ast: QueryNode): OptimizationFlags {
	// Keep this deliberately conservative to avoid semantic drift.
	// Step 3 expands this with real opt passes.
	return {
		inlineSimpleSelectors: true,
		shortCircuitFilters: true,
	};
}
