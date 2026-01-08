import { computed } from '@data-map/signals';
import type { DataMapComputeHost } from './types.js';
import { DependencyTracker } from './dependency-tracker.js';

export function queryComputed<T = unknown>(
	host: DataMapComputeHost,
	path: string,
) {
	const tracker = new DependencyTracker(host);
	const c = computed(() => {
		const pointers = host.queryPointers(path);
		return pointers.map((p) => host.get(p)) as T;
	});
	tracker.trackQuery(path, () => {
		// Invalidate by recomputing
	});
	return {
		computed: c,
		dispose: () => tracker.dispose(),
	};
}
