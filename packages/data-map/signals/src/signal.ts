import { isBatching, queueObserver } from './batch.js';
import { currentObserver } from './context.js';
import type { DependencySource, Observer } from './internal.js';
import type { Signal as SignalType, Subscriber, Unsubscribe } from './types.js';

class SignalImpl<T> implements SignalType<T>, DependencySource {
	private _value: T;
	private observers: Set<Observer> | null = null;
	private subscribers: Set<Subscriber<T>> | null = null;

	private isNotifying = false;
	private pending:
		| (
				| { kind: 'sub'; op: 'add' | 'rem'; target: Subscriber<T> }
				| { kind: 'obs'; op: 'add' | 'rem'; target: Observer }
		  )[]
		| null = null;

	constructor(initial: T) {
		this._value = initial;
	}

	get value(): T {
		// Inline tracking to remove an extra function call from the hot path.
		const obs = currentObserver();
		if (obs) obs.onDependencyRead(this);
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
			(this.pending ??= []).push({
				kind: 'sub',
				op: 'add',
				target: subscriber,
			});
		} else {
			(this.subscribers ??= new Set()).add(subscriber);
		}

		return () => {
			if (this.isNotifying) {
				(this.pending ??= []).push({
					kind: 'sub',
					op: 'rem',
					target: subscriber,
				});
				return;
			}
			this.subscribers?.delete(subscriber);
		};
	}

	addObserver(observer: Observer): void {
		if (this.isNotifying) {
			(this.pending ??= []).push({ kind: 'obs', op: 'add', target: observer });
			return;
		}
		(this.observers ??= new Set()).add(observer);
	}

	removeObserver(observer: Observer): void {
		if (this.isNotifying) {
			(this.pending ??= []).push({ kind: 'obs', op: 'rem', target: observer });
			return;
		}
		this.observers?.delete(observer);
	}

	triggerObservers(): void {
		this.notify();
	}

	private flushPending(): void {
		const pending = this.pending;
		if (!pending || pending.length === 0) return;
		this.pending = null;

		for (const op of pending) {
			if (op.kind === 'sub') {
				const set = (this.subscribers ??= new Set());
				if (op.op === 'add') set.add(op.target);
				else set.delete(op.target);
				continue;
			}

			const set = (this.observers ??= new Set());
			if (op.op === 'add') set.add(op.target);
			else set.delete(op.target);
		}
	}

	private notify(): void {
		this.isNotifying = true;
		try {
			if (this.subscribers) {
				for (const sub of this.subscribers) sub(this._value);
			}
			if (this.observers) {
				for (const obs of this.observers) {
					if (isBatching()) queueObserver(obs);
					else obs.onDependencyChanged();
				}
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
