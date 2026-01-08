import type {
	Pointer,
	Subscriber,
	Subscription,
	SubscriptionEvent,
	Unsubscribe,
} from './types.js';
import { ExactIndex } from './exact-index.js';
import { PatternIndex } from './pattern-index.js';
import { NotificationBatcher } from './notification-batcher.js';

export class SubscriptionEngine {
	private exact = new ExactIndex();
	private patterns = new PatternIndex();
	private batcher = new NotificationBatcher();

	subscribePointer(pointer: Pointer, subscriber: Subscriber): Unsubscribe {
		const sub: Subscription = {
			id: Symbol('sub'),
			kind: 'exact',
			pattern: pointer,
			subscriber,
		};
		this.exact.add(pointer, sub);
		return () => {
			this.exact.delete(pointer, sub);
		};
	}

	subscribePattern(pathPattern: string, subscriber: Subscriber): Unsubscribe {
		const sub: Subscription = {
			id: Symbol('sub'),
			kind: 'pattern',
			pattern: pathPattern,
			subscriber,
		};
		this.patterns.add(sub);
		return () => {
			this.patterns.delete(sub);
		};
	}

	notify(pointer: Pointer, value: unknown): void {
		const event: SubscriptionEvent = { pointer, value };
		for (const sub of this.exact.get(pointer)) this.batcher.queue(sub, event);
		for (const sub of this.patterns.match(pointer))
			this.batcher.queue(sub, event);
	}
}
