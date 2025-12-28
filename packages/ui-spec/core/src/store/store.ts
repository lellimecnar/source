import type {
	StoreListener,
	UISpecStore,
	Unsubscribe,
	WriteResult,
} from './types';
import {
	findJsonPathPointers,
	getByJsonPointer,
	readJsonPath,
	removeByJsonPointer,
	setByJsonPointer,
	type JSONPathEvalMode,
} from '../bindings/jsonpath';

export interface CreateStoreOptions {
	jsonPathEvalMode?: JSONPathEvalMode;
}

function emptyWriteResult(): WriteResult {
	return { matched: 0, changed: 0, errors: [] };
}

export function createStore(
	initialData: unknown,
	options?: CreateStoreOptions,
): UISpecStore {
	let data = initialData;
	const listeners = new Set<StoreListener>();
	const pathListeners = new Map<string, Set<StoreListener>>();
	let batching = 0;
	let pendingNotify = false;

	const evalMode = options?.jsonPathEvalMode ?? 'safe';

	const notifyAll = () => {
		for (const listener of Array.from(listeners)) listener();

		for (const [path, set] of Array.from(pathListeners.entries())) {
			const snapshot = readJsonPath(data, path, { evalMode });
			for (const listener of Array.from(set)) {
				// Path listeners are called on any mutation; React-level equality checks happen in binding hooks.
				void snapshot;
				listener();
			}
		}
	};

	const scheduleNotify = () => {
		if (batching > 0) {
			pendingNotify = true;
			return;
		}
		notifyAll();
	};

	const writeEachPointer = (
		path: string,
		apply: (pointer: string) => { ok: true } | { ok: false; error: string },
	): WriteResult => {
		const pointers = findJsonPathPointers(data, path, { evalMode });
		const result = emptyWriteResult();
		result.matched = pointers.length;

		for (const pointer of pointers) {
			const before = getByJsonPointer(data, pointer);
			const res = apply(pointer);
			if (!res.ok) {
				result.errors.push({ path, pointer, message: res.error });
				continue;
			}
			const after = getByJsonPointer(data, pointer);
			if (!Object.is(before, after)) result.changed += 1;
		}

		// Ensure top-level reference changes for external-store semantics.
		data =
			isPlainObject(data) || Array.isArray(data)
				? structuredClone(data as any)
				: data;
		scheduleNotify();
		return result;
	};

	return {
		getData() {
			return data;
		},
		setData(nextData: unknown) {
			data = nextData;
			scheduleNotify();
		},
		get(path: string) {
			return readJsonPath(data, path, { evalMode });
		},
		select(path: string) {
			return readJsonPath(data, path, { evalMode });
		},
		subscribe(listener: StoreListener): Unsubscribe {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		subscribePath(path: string, listener: StoreListener): Unsubscribe {
			const set = pathListeners.get(path) ?? new Set<StoreListener>();
			set.add(listener);
			pathListeners.set(path, set);
			return () => {
				const current = pathListeners.get(path);
				if (!current) return;
				current.delete(listener);
				if (current.size === 0) pathListeners.delete(path);
			};
		},
		set(path: string, value: unknown) {
			return writeEachPointer(path, (pointer) =>
				setByJsonPointer(data, pointer, value),
			);
		},
		update(path: string, fn: (prev: unknown) => unknown) {
			return writeEachPointer(path, (pointer) => {
				const prev = getByJsonPointer(data, pointer);
				return setByJsonPointer(data, pointer, fn(prev));
			});
		},
		merge(path: string, value: Record<string, unknown>) {
			return writeEachPointer(path, (pointer) => {
				const prev = getByJsonPointer(data, pointer);
				if (prev == null || typeof prev !== 'object' || Array.isArray(prev)) {
					return { ok: false, error: 'merge target must be an object.' };
				}
				return setByJsonPointer(data, pointer, { ...(prev as any), ...value });
			});
		},
		push(path: string, value: unknown) {
			return writeEachPointer(path, (pointer) => {
				const prev = getByJsonPointer(data, pointer);
				if (!Array.isArray(prev))
					return { ok: false, error: 'push target must be an array.' };
				prev.push(value);
				return { ok: true };
			});
		},
		remove(path: string) {
			return writeEachPointer(path, (pointer) =>
				removeByJsonPointer(data, pointer),
			);
		},
		batch(ops: (() => void)[]) {
			batching += 1;
			try {
				for (const op of ops) op();
			} finally {
				batching -= 1;
				if (batching === 0 && pendingNotify) {
					pendingNotify = false;
					notifyAll();
				}
			}
		},
		transaction<T>(fn: () => T) {
			batching += 1;
			try {
				return fn();
			} finally {
				batching -= 1;
				if (batching === 0 && pendingNotify) {
					pendingNotify = false;
					notifyAll();
				}
			}
		},
	};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
