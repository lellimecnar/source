import type { StoreListener, UISpecStore, Unsubscribe } from './types';
import { readJsonPath } from '../bindings/jsonpath';

export interface CreateStoreOptions {
	jsonPathEvalMode?: 'safe' | 'native' | false;
}

export function createStore(
	initialData: unknown,
	options?: CreateStoreOptions,
): UISpecStore {
	let data = initialData;
	const listeners = new Set<StoreListener>();

	const notify = () => {
		for (const listener of Array.from(listeners)) listener();
	};

	return {
		getData() {
			return data;
		},

		setData(nextData: unknown) {
			data = nextData;
			notify();
		},

		get(path: string) {
			return readJsonPath(data, path, {
				evalMode: options?.jsonPathEvalMode ?? 'safe',
			});
		},

		subscribe(listener: StoreListener): Unsubscribe {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
