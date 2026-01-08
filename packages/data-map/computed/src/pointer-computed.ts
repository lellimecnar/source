import { computed } from '@data-map/signals';
import type { DataMapComputeHost, Pointer } from './types.js';
import { DependencyTracker } from './dependency-tracker.js';

export function pointerComputed<T = unknown>(
	host: DataMapComputeHost,
	pointer: Pointer,
) {
	const tracker = new DependencyTracker(host);
	const c = computed(() => host.get(pointer) as T);
	tracker.trackPointers([pointer], () => {
		// Invalidate by recomputing
	});
	return {
		computed: c,
		dispose: () => tracker.dispose(),
	};
}
