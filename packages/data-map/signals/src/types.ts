export type CleanupFn = () => void;

export type Subscriber<T> = (value: T) => void;

export type Unsubscribe = () => void;

export interface ReadonlySignal<T> {
	readonly value: T;
	subscribe: (subscriber: Subscriber<T>) => Unsubscribe;
}

export interface Signal<T> extends ReadonlySignal<T> {
	value: T;
	peek: () => T;
}

export interface Computed<T> extends ReadonlySignal<T> {
	invalidate: () => void;
}

export interface EffectHandle {
	dispose: () => void;
}
