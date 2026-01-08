import type { Subscription, SubscriptionEvent } from './types.js';

export class NotificationBatcher {
	private pending = new Map<
		symbol,
		{ sub: Subscription; event: SubscriptionEvent }
	>();
	private scheduled = false;

	queue(sub: Subscription, event: SubscriptionEvent): void {
		this.pending.set(sub.id, { sub, event });
		if (this.scheduled) return;
		this.scheduled = true;
		queueMicrotask(() => this.flush());
	}

	flush(): void {
		this.scheduled = false;
		if (this.pending.size === 0) return;
		const items = Array.from(this.pending.values());
		this.pending.clear();
		for (const { sub, event } of items) sub.subscriber(event);
	}
}
