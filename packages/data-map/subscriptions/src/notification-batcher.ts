import type { Subscription, SubscriptionEvent } from './types.js';

export class NotificationBatcher {
	private pending = new Map<
		symbol,
		{ sub: Subscription; event: SubscriptionEvent }
	>();
	private draining = new Map<
		symbol,
		{ sub: Subscription; event: SubscriptionEvent }
	>();
	private scheduled = false;

	queue(sub: Subscription, event: SubscriptionEvent): void {
		this.pending.set(sub.id, { sub, event });
		if (this.scheduled) return;
		this.scheduled = true;
		queueMicrotask(() => {
			this.flush();
		});
	}

	flush(): void {
		this.scheduled = false;
		if (this.pending.size === 0) return;

		// Swap maps so we can drain without allocating snapshots.
		const tmp = this.draining;
		this.draining = this.pending;
		this.pending = tmp;
		this.pending.clear();

		for (const { sub, event } of this.draining.values()) {
			sub.subscriber(event);
		}
		this.draining.clear();
	}
}
