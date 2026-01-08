import { isBatching, queueObserver } from './batch.js';
import { popObserver, pushObserver, trackRead } from './context.js';
import type { DependencySource, Observer } from './internal.js';
import type { ReadonlySignal, Subscriber, Unsubscribe } from './types.js';

class ComputedImpl<T> implements ReadonlySignal<T>, DependencySource, Observer {
	private compute: () => T;
	private _value!: T;
	private dirty = true;

	private sources = new Set<DependencySource>();
	private observers = new Set<Observer>();
	private subscribers = new Set<Subscriber<T>>();

	constructor(compute: () => T) {
		this.compute = compute;
	}

	get value(): T {
		trackRead(this);
		if (this.dirty) this.recompute();
		return this._value;
	}

	subscribe(subscriber: Subscriber<T>): Unsubscribe {
		this.subscribers.add(subscriber);
		return () => {
			this.subscribers.delete(subscriber);
		};
	}

	addObserver(observer: Observer): void {
		this.observers.add(observer);
	}

	removeObserver(observer: Observer): void {
		this.observers.delete(observer);
	}

	onDependencyRead(source: DependencySource): void {
		if (this.sources.has(source)) return;
		this.sources.add(source);
		source.addObserver(this);
	}

	onDependencyChanged(): void {
		if (this.dirty) return;
		this.dirty = true;
		// Snapshot iteration prevents pathological re-entrancy when observers
		// trigger effects that re-track dependencies during notification.
		const observers = Array.from(this.observers);
		for (const obs of observers) {
			if (isBatching()) queueObserver(obs);
			else obs.onDependencyChanged();
		}
		const subs = Array.from(this.subscribers);
		for (const sub of subs) sub(this._value);
	}

	invalidate(): void {
		this.onDependencyChanged();
	}

	private recompute(): void {
		for (const src of this.sources) src.removeObserver(this);
		this.sources.clear();
		pushObserver(this);
		try {
			const next = this.compute();
			this._value = next;
			this.dirty = false;
		} finally {
			popObserver();
		}
	}
}

export function computed<T>(fn: () => T): ComputedImpl<T> {
	return new ComputedImpl(fn);
}
