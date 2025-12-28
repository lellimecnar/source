export type Unsubscribe = () => void;
export type StoreListener = () => void;

export interface UISpecStore {
	getData: () => unknown;
	setData: (nextData: unknown) => void;
	get: (path: string) => unknown;
	subscribe: (listener: StoreListener) => Unsubscribe;
}
