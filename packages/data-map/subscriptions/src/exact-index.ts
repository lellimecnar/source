import type { Pointer, Subscription } from './types.js';

export class ExactIndex {
	private subscriptions = new Map<Pointer, Set<Subscription>>();

	add(pointer: Pointer, sub: Subscription): void {
		const set = this.subscriptions.get(pointer) ?? new Set<Subscription>();
		set.add(sub);
		this.subscriptions.set(pointer, set);
	}

	delete(pointer: Pointer, sub: Subscription): void {
		const set = this.subscriptions.get(pointer);
		if (!set) return;
		set.delete(sub);
		if (set.size === 0) this.subscriptions.delete(pointer);
	}

	get(pointer: Pointer): Set<Subscription> {
		return this.subscriptions.get(pointer) ?? new Set();
	}
}
