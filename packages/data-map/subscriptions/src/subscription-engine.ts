import { ExactIndex } from './exact-index.js';
import { NotificationBatcher } from './notification-batcher.js';
import { PatternIndex } from './pattern-index.js';
import type {
	Pointer,
	Subscriber,
	Subscription,
	SubscriptionEvent,
	SubscriptionOptions,
	SubscriptionStage,
	Unsubscribe,
} from './types.js';

export class SubscriptionEngine {
	private exact = new ExactIndex();
	private patterns = new PatternIndex();
	private batcher = new NotificationBatcher();
	private active = new Set<symbol>();
	private debounceTimers = new Map<symbol, ReturnType<typeof setTimeout>>();
	private debounceEvents = new Map<symbol, SubscriptionEvent>();

	get size(): number {
		return this.active.size;
	}

	clear(): void {
		for (const t of this.debounceTimers.values()) clearTimeout(t);
		this.debounceTimers.clear();
		this.debounceEvents.clear();
		this.active.clear();
		this.exact.clear();
		this.patterns = new PatternIndex();
		this.batcher = new NotificationBatcher();
	}

	subscribePointer(
		pointer: Pointer,
		subscriber: Subscriber,
		options?: SubscriptionOptions,
	): Unsubscribe {
		const sub: Subscription = {
			id: Symbol('sub'),
			kind: 'exact',
			pattern: pointer,
			subscriber,
			options,
		};
		this.active.add(sub.id);
		this.exact.add(pointer, sub);

		if (options?.immediate) {
			const stage = (options.stages?.[0] ?? 'on') satisfies SubscriptionStage;
			const event: SubscriptionEvent = {
				pointer,
				value: undefined,
				previousValue: undefined,
				stage,
				cancel() {
					// no-op for immediate notifications
				},
			};
			this.deliver(sub, event, { allowBatch: false });
		}

		return () => {
			if (!this.active.delete(sub.id)) return;
			this.clearDebounce(sub.id);
			this.exact.delete(pointer, sub);
		};
	}

	subscribePattern(
		pathPattern: string,
		subscriber: Subscriber,
		options?: SubscriptionOptions,
	): Unsubscribe {
		const sub: Subscription = {
			id: Symbol('sub'),
			kind: 'pattern',
			pattern: pathPattern,
			subscriber,
			options,
		};
		this.active.add(sub.id);
		this.patterns.add(sub);
		return () => {
			if (!this.active.delete(sub.id)) return;
			this.clearDebounce(sub.id);
			this.patterns.delete(sub);
		};
	}

	getAffected(pointer: Pointer): Set<Subscription> {
		const out = new Set<Subscription>();

		for (const sub of this.exact.get(pointer)) out.add(sub);
		for (const [prefix, set] of this.exact.prefixMatches(pointer)) {
			for (const sub of set) {
				if (prefix === pointer || sub.options?.deep) out.add(sub);
			}
		}
		for (const sub of this.patterns.match(pointer)) out.add(sub);

		return out;
	}

	notify(pointer: Pointer, value: unknown, previousValue?: unknown): void {
		const stages: SubscriptionStage[] = ['before', 'on', 'after'];
		let canceled = false;
		const cancel = () => {
			canceled = true;
		};

		const affected = this.getAffected(pointer);
		for (const stage of stages) {
			if (canceled) return;

			const event: SubscriptionEvent = {
				pointer,
				value,
				previousValue,
				stage,
				cancel,
			};

			for (const sub of affected) {
				if (canceled) return;
				this.deliver(sub, event, { allowBatch: stage === 'on' });
			}
		}
	}

	private deliver(
		sub: Subscription,
		event: SubscriptionEvent,
		options: { allowBatch: boolean },
	): void {
		const stages = sub.options?.stages ?? ['on'];
		if (!stages.includes(event.stage)) return;

		// Debounce applies to 'on' stage only.
		const debounceMs = sub.options?.debounce;
		if (
			event.stage === 'on' &&
			typeof debounceMs === 'number' &&
			debounceMs > 0
		) {
			this.debounceEvents.set(sub.id, event);
			const existing = this.debounceTimers.get(sub.id);
			if (existing) clearTimeout(existing);
			this.debounceTimers.set(
				sub.id,
				setTimeout(() => {
					this.debounceTimers.delete(sub.id);
					const e = this.debounceEvents.get(sub.id);
					if (!e) return;
					this.debounceEvents.delete(sub.id);
					sub.subscriber(e);
				}, debounceMs),
			);
			return;
		}

		if (options.allowBatch) {
			this.batcher.queue(sub, event);
			return;
		}

		sub.subscriber(event);
	}

	private clearDebounce(id: symbol): void {
		const t = this.debounceTimers.get(id);
		if (t) clearTimeout(t);
		this.debounceTimers.delete(id);
		this.debounceEvents.delete(id);
	}
}
