import { isBatching, queueObserver } from './batch.js';
import { trackRead } from './context.js';
import type { DependencySource, Observer } from './internal.js';
import type { Signal as SignalType, Subscriber, Unsubscribe } from './types.js';

class SignalImpl<T> implements SignalType<T>, DependencySource {
	private _value: T;
	private observers = new Set<Observer>();
	private subscribers = new Set<Subscriber<T>>();

	constructor(initial: T) {
		this._value = initial;
	}

	get value(): T {
		trackRead(this);
		return this._value;
	}

	set value(next: T) {
		if (Object.is(this._value, next)) return;
		this._value = next;
		this.notify();
	}

	peek(): T {
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

	triggerObservers(): void {
		this.notify();
	}

	private notify(): void {
		// Snapshot iteration prevents pathological re-entrancy when callbacks
		// subscribe/unsubscribe or (re)track dependencies during notification.
		const subs = Array.from(this.subscribers);
		for (const sub of subs) sub(this._value);
		const observers = Array.from(this.observers);
		for (const obs of observers) {
			if (isBatching()) queueObserver(obs);
			else obs.onDependencyChanged();
		}
	}
}

export function signal<T>(initial: T): SignalType<T> {
	return new SignalImpl(initial);
}
