/**
 * @jsonpath/compiler
 *
 * Cache for compiled queries.
 *
 * @packageDocumentation
 */

import type { CompiledQuery } from './compiled-query.js';

type Entry = {
	key: string;
	value: CompiledQuery;
	prev: Entry | null;
	next: Entry | null;
};

export class LRUCache {
	private readonly capacity: number;
	private readonly map = new Map<string, Entry>();
	private head: Entry | null = null;
	private tail: Entry | null = null;

	constructor(capacity: number) {
		if (!Number.isFinite(capacity) || capacity < 1)
			throw new Error('cacheSize must be >= 1');
		this.capacity = capacity;
	}

	get(key: string): CompiledQuery | undefined {
		const entry = this.map.get(key);
		if (!entry) return undefined;
		this.touch(entry);
		return entry.value;
	}

	set(key: string, value: CompiledQuery): void {
		const existing = this.map.get(key);
		if (existing) {
			existing.value = value;
			this.touch(existing);
			return;
		}
		const entry: Entry = { key, value, prev: null, next: this.head };
		if (this.head) this.head.prev = entry;
		this.head = entry;
		if (!this.tail) this.tail = entry;
		this.map.set(key, entry);
		if (this.map.size > this.capacity) this.evict();
	}

	private touch(entry: Entry): void {
		if (this.head === entry) return;
		// unlink
		if (entry.prev) entry.prev.next = entry.next;
		if (entry.next) entry.next.prev = entry.prev;
		if (this.tail === entry) this.tail = entry.prev;
		// move to head
		entry.prev = null;
		entry.next = this.head;
		if (this.head) this.head.prev = entry;
		this.head = entry;
		if (!this.tail) this.tail = entry;
	}

	private evict(): void {
		const entry = this.tail;
		if (!entry) return;
		this.map.delete(entry.key);
		this.tail = entry.prev;
		if (this.tail) this.tail.next = null;
		if (!this.tail) this.head = null;
	}
}
