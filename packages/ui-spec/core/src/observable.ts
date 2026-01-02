export type Unsubscribe = () => void;

export type Listener<T> = (value: T) => void;

export function createEmitter<T>() {
	const listeners = new Set<Listener<T>>();

	return {
		emit(value: T) {
			for (const listener of Array.from(listeners)) {
				listener(value);
			}
		},
		subscribe(listener: Listener<T>): Unsubscribe {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

export interface Observable<T> {
	get: () => T;
	subscribe: (listener: Listener<T>) => Unsubscribe;
}
