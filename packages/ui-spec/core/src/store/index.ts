export type UISpecStoreListener = () => void;

export interface UISpecStore {
	get: (path: string) => unknown;
	setData: (nextData: unknown) => void;
	subscribe: (listener: UISpecStoreListener) => () => void;
}

export function createUISpecStore(_initialData: unknown): UISpecStore {
	throw new Error('createUISpecStore is not implemented yet.');
}
