export type Unsubscribe = () => void;
export type StoreListener = () => void;

export interface WriteError {
	path: string;
	pointer?: string;
	message: string;
}

export interface WriteResult {
	matched: number;
	changed: number;
	errors: WriteError[];
}

export type UpdateFn = (prev: unknown) => unknown;

export interface UISpecStore {
	getData: () => unknown;
	setData: (nextData: unknown) => void;

	get: (path: string) => unknown;
	select: (path: string) => unknown;

	subscribe: (listener: StoreListener) => Unsubscribe;
	subscribePath: (path: string, listener: StoreListener) => Unsubscribe;

	set: (path: string, value: unknown) => WriteResult;
	update: (path: string, fn: UpdateFn) => WriteResult;
	merge: (path: string, value: Record<string, unknown>) => WriteResult;
	push: (path: string, value: unknown) => WriteResult;
	remove: (path: string) => WriteResult;

	batch: (ops: (() => void)[]) => void;
	transaction: <T>(fn: () => T) => T;
}
