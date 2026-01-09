type Entry<V> = {
	key: string;
	value: V;
	prev: Entry<V> | null;
	next: Entry<V> | null;
};

export class QueryCache<T> {
	private readonly capacity: number;
	private readonly map = new Map<string, Entry<T>>();
	private head: Entry<T> | null = null;
	private tail: Entry<T> | null = null;

	constructor(maxSize = 500) {
		this.capacity = maxSize;
	}

	get(key: string): T | undefined {
		const entry = this.map.get(key);
		if (!entry) return undefined;
		this.moveToFront(entry);
		return entry.value;
	}

	set(key: string, value: T): void {
		const existing = this.map.get(key);
		if (existing) {
			existing.value = value;
			this.moveToFront(existing);
			return;
		}

		const entry: Entry<T> = { key, value, prev: null, next: null };
		this.map.set(key, entry);
		this.addToFront(entry);

		if (this.map.size > this.capacity) {
			this.evictTail();
		}
	}

	private addToFront(entry: Entry<T>): void {
		entry.prev = null;
		entry.next = this.head;
		if (this.head) this.head.prev = entry;
		this.head = entry;
		if (!this.tail) this.tail = entry;
	}

	private remove(entry: Entry<T>): void {
		const { prev, next } = entry;
		if (prev) prev.next = next;
		if (next) next.prev = prev;
		if (this.head === entry) this.head = next;
		if (this.tail === entry) this.tail = prev;
		entry.prev = null;
		entry.next = null;
	}

	private moveToFront(entry: Entry<T>): void {
		if (this.head === entry) return;
		this.remove(entry);
		this.addToFront(entry);
	}

	private evictTail(): void {
		const tail = this.tail;
		if (!tail) return;
		this.remove(tail);
		this.map.delete(tail.key);
	}
}
