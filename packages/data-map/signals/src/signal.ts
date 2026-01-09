import { isBatching, queueObserver } from './batch.js';
import { trackRead } from './context.js';
import type { DependencySource, Observer } from './internal.js';
import type { Signal as SignalType, Subscriber, Unsubscribe } from './types.js';

class SignalImpl<T> implements SignalType<T>, DependencySource {
	private _value: T;
	private observers = new Set<Observer>();
	private subscribers = new Set<Subscriber<T>>();

	private isNotifying = false;
	private pendingObserverAdd = new Set<Observer>();
	private pendingObserverRemove = new Set<Observer>();
	private pendingSubscriberAdd = new Set<Subscriber<T>>();
	private pendingSubscriberRemove = new Set<Subscriber<T>>();

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
		if (this.isNotifying) {
			this.pendingSubscriberRemove.delete(subscriber);
			this.pendingSubscriberAdd.add(subscriber);
		} else {
			this.subscribers.add(subscriber);
		}

		return () => {
			if (this.isNotifying) {
				this.pendingSubscriberAdd.delete(subscriber);
				this.pendingSubscriberRemove.add(subscriber);
				return;
			}
			this.subscribers.delete(subscriber);
		};
	}

	addObserver(observer: Observer): void {
		if (this.isNotifying) {
			this.pendingObserverRemove.delete(observer);
			this.pendingObserverAdd.add(observer);
			return;
		}
		this.observers.add(observer);
	}

	removeObserver(observer: Observer): void {
		if (this.isNotifying) {
			this.pendingObserverAdd.delete(observer);
			this.pendingObserverRemove.add(observer);
			return;
		}
		this.observers.delete(observer);
	}

	triggerObservers(): void {
		this.notify();
	}

	private flushPending(): void {
		if (this.pendingSubscriberAdd.size > 0) {
			for (const s of this.pendingSubscriberAdd) this.subscribers.add(s);
			this.pendingSubscriberAdd.clear();
		}
		if (this.pendingSubscriberRemove.size > 0) {
			for (const s of this.pendingSubscriberRemove) this.subscribers.delete(s);
			this.pendingSubscriberRemove.clear();
		}

		if (this.pendingObserverAdd.size > 0) {
			for (const o of this.pendingObserverAdd) this.observers.add(o);
			this.pendingObserverAdd.clear();
		}
		if (this.pendingObserverRemove.size > 0) {
			for (const o of this.pendingObserverRemove) this.observers.delete(o);
			this.pendingObserverRemove.clear();
		}
	}

	private notify(): void {
		this.isNotifying = true;
		try {
			// Iterate the Sets directly to avoid allocations.
			for (const sub of this.subscribers) sub(this._value);
			for (const obs of this.observers) {
				if (isBatching()) queueObserver(obs);
				else obs.onDependencyChanged();
			}
		} finally {
			this.isNotifying = false;
			this.flushPending();
		}
	}
}

export function signal<T>(initial: T): SignalType<T> {
	return new SignalImpl(initial);
}
