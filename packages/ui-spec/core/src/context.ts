import type { FunctionRegistry } from './function-registry';
import type { Observable } from './observable';
import type { JsonPatchOperation, UISpecStore } from './store';

export interface UISpecContext {
	store: UISpecStore;
	functions: FunctionRegistry;

	get: <T = unknown>(path: string) => T;
	select: <T = unknown>(path: string) => Observable<T>;
	patch: (operations: JsonPatchOperation[]) => void;
	set: (path: string, value: unknown) => void;
	update: (path: string, updater: (current: unknown) => unknown) => void;
	merge: (path: string, partial: Record<string, unknown>) => void;
	push: (path: string, ...items: unknown[]) => void;
	remove: (path: string, predicate: (item: unknown) => boolean) => void;

	call: (id: string, ...args: unknown[]) => unknown;
}

export function createUISpecContext(params: {
	store: UISpecStore;
	functions: FunctionRegistry;
}): UISpecContext {
	const { store, functions } = params;

	const ctx: UISpecContext = {
		store,
		functions,
		get: (path) => store.get(path),
		select: (path) => store.select(path),
		patch: (ops) => store.patch(ops),
		set: (path, value) => store.set(path, value),
		update: (path, updater) => store.update(path, updater),
		merge: (path, partial) => store.merge(path, partial),
		push: (path, ...items) => store.push(path, ...items),
		remove: (path, predicate) => store.remove(path, predicate),
		call: (id, ...args) => functions.call(id, ctx, ...args),
	};

	return ctx;
}
