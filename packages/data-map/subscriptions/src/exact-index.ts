import { TrieIndex } from './trie-index.js';
import type { Pointer, Subscription } from './types.js';

export class ExactIndex {
	private subscriptions = new TrieIndex<Set<Subscription>>();

	clear(): void {
		this.subscriptions.clear();
	}

	get size(): number {
		return this.subscriptions.size;
	}

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

	/**
	 * Returns matching prefix entries, respecting JSON Pointer boundaries.
	 * E.g. subscribing to `/a` deep should not match `/a2`.
	 */
	prefixMatches(pointer: Pointer): [Pointer, Set<Subscription>][] {
		return this.subscriptions.prefixMatches(pointer, {
			boundary: (key, endIdx) =>
				endIdx === key.length - 1 || key[endIdx + 1] === '/',
		});
	}
}
