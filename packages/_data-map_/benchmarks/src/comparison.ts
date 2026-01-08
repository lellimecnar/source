/**
 * Benchmark comparison utilities
 * Provides helpers for running side-by-side comparisons across adapters
 */

import type { BenchmarkAdapter, PatchOp } from './adapters/types.js';

export interface ComparisonConfig {
	/** Adapters to compare */
	adapters: BenchmarkAdapter[];
	/** Test data */
	data: unknown;
	/** Path for operations */
	path: string;
	/** Value for set operations */
	value?: unknown;
	/** Patches for patch operations */
	patches?: PatchOp[];
}

/**
 * Filter adapters that support a specific operation
 */
export function filterByOperation(
	adapters: BenchmarkAdapter[],
	operation: keyof BenchmarkAdapter,
): BenchmarkAdapter[] {
	return adapters.filter((a) => typeof a[operation] === 'function');
}

/**
 * Get adapters with get capability
 */
export function getAccessAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter((a) => a.features.get && typeof a.get === 'function');
}

/**
 * Get adapters with set capability
 */
export function getMutationAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter((a) => a.features.set && typeof a.set === 'function');
}

/**
 * Get adapters with immutable update capability
 */
export function getImmutableAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) =>
			a.features.immutable &&
			(typeof a.immutableUpdate === 'function' || typeof a.set === 'function'),
	);
}

/**
 * Get adapters with patch capability
 */
export function getPatchAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) => a.features.patch && typeof a.applyPatch === 'function',
	);
}

/**
 * Get adapters with clone capability
 */
export function getCloneAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) => a.features.clone && typeof a.clone === 'function',
	);
}

/**
 * Get adapters with subscribe capability
 */
export function getSubscribeAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) => a.features.subscribe && typeof a.subscribe === 'function',
	);
}

/**
 * Get adapters with batch capability
 */
export function getBatchAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) => a.features.batch && typeof a.batch === 'function',
	);
}

/**
 * Get adapters with array push capability
 */
export function getPushAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) => a.features.push && typeof a.push === 'function',
	);
}

/**
 * Get adapters with array pop capability
 */
export function getPopAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter((a) => a.features.pop && typeof a.pop === 'function');
}

/**
 * Get adapters with sort capability
 */
export function getSortAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) => a.features.sort && typeof a.sort === 'function',
	);
}

/**
 * Get adapters with map capability
 */
export function getMapAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter((a) => a.features.map && typeof a.map === 'function');
}

/**
 * Get adapters with shift capability
 */
export function getShiftAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) => a.features.shift && typeof a.shift === 'function',
	);
}

/**
 * Get adapters with unshift capability
 */
export function getUnshiftAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) => a.features.unshift && typeof a.unshift === 'function',
	);
}

/**
 * Get adapters with splice capability
 */
export function getSpliceAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) => a.features.splice && typeof a.splice === 'function',
	);
}

/**
 * Get adapters with transaction capability
 */
export function getTransactionAdapters(
	adapters: BenchmarkAdapter[],
): BenchmarkAdapter[] {
	return adapters.filter(
		(a) => a.features.transaction && typeof a.transaction === 'function',
	);
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Calculate approximate JSON size
 */
export function getDataSize(data: unknown): number {
	return JSON.stringify(data).length;
}
