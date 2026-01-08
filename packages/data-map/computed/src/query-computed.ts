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
	const invalidate = () => {
		c.invalidate();
		// Refresh pointer subscriptions in case the query result set changed.
		tracker.trackQuery(path, invalidate);
	};
	tracker.trackQuery(path, invalidate);
	return {
		computed: c,
		dispose: () => tracker.dispose(),
	};
}
