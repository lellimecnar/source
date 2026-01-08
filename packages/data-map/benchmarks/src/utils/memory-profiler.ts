/**
 * Memory profiling utilities for benchmark suites.
 *
 * Provides helpers for measuring memory usage, heap snapshots, and garbage collection behavior.
 */

export interface MemorySnapshot {
	timestamp: number;
	heapUsed: number;
	heapTotal: number;
	external: number;
	rss: number; // Resident set size
}

export function captureMemory(): MemorySnapshot {
	const mem = process.memoryUsage();
	return {
		timestamp: Date.now(),
		heapUsed: mem.heapUsed,
		heapTotal: mem.heapTotal,
		external: mem.external,
		rss: mem.rss,
	};
}

export function deltaMemory(before: MemorySnapshot, after: MemorySnapshot) {
	return {
		heapUsed: after.heapUsed - before.heapUsed,
		heapTotal: after.heapTotal - before.heapTotal,
		external: after.external - before.external,
		rss: after.rss - before.rss,
		duration: after.timestamp - before.timestamp,
	};
}

/**
 * Warm up the garbage collector before running memory-sensitive benchmarks.
 * This helps ensure more stable memory measurements.
 */
export function warmupGC() {
	if (typeof global !== 'undefined' && global.gc) {
		global.gc();
	}
}

/**
 * Force garbage collection before and after a test.
 * Use sparingly as this can affect benchmark accuracy.
 */
export function withGC<T>(fn: () => T): T {
	warmupGC();
	const result = fn();
	warmupGC();
	return result;
}
