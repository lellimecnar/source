import { useMemo, useSyncExternalStore } from 'react';

import { useUISpecRuntime } from './context';

export function useUISpecValue<T = unknown>(path: string): T {
	const { store } = useUISpecRuntime();
	const observable = useMemo(() => store.select<T>(path), [store, path]);

	return useSyncExternalStore(
		(onStoreChange) => {
			let first = true;
			return observable.subscribe(() => {
				// select() emits immediately; ignore the first call.
				if (first) {
					first = false;
					return;
				}
				onStoreChange();
			});
		},
		() => observable.get(),
	);
}
