import { computed } from '@data-map/signals';

import { DependencyTracker } from './dependency-tracker.js';
import type { DataMapComputeHost, Pointer } from './types.js';

export function multiPointerComputed<T>(
	host: DataMapComputeHost,
	pointers: Pointer[],
	compute: (...values: unknown[]) => T,
) {
	const tracker = new DependencyTracker(host);
	const c = computed(() => {
		const values = pointers.map((p) => host.get(p));
		return compute(...values);
	});
	tracker.trackPointers(pointers, () => {
		c.invalidate();
	});
	return {
		computed: c,
		dispose: () => {
			tracker.dispose();
		},
	};
}
