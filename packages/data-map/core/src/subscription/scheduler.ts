export class NotificationScheduler {
	private queue: (() => void)[] = [];
	private scheduled = false;

	schedule(fn: () => void): void {
		this.queue.push(fn);
		if (this.scheduled) return;
		this.scheduled = true;
		queueMicrotask(() => {
			this.flush();
		});
	}

	private flush(): void {
		const currentQueue = this.queue;
		this.queue = [];
		this.scheduled = false;

		for (const fn of currentQueue) {
			try {
				fn();
			} catch (e) {
				console.error('Error in scheduled notification:', e);
			}
		}
	}
}
