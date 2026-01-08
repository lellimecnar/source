export class QueryCache<T> {
	private cache: Map<string, T>;
	private maxSize: number;
	private accessOrder: string[] = [];

	constructor(maxSize = 500) {
		this.cache = new Map<string, T>();
		this.maxSize = maxSize;
	}

	get(key: string): T | undefined {
		const val = this.cache.get(key);
		if (val !== undefined) {
			// Update access order for LRU
			this.accessOrder = this.accessOrder.filter((k) => k !== key);
			this.accessOrder.push(key);
		}
		return val;
	}

	set(key: string, value: T): void {
		if (this.cache.has(key)) {
			this.accessOrder = this.accessOrder.filter((k) => k !== key);
		} else if (this.cache.size >= this.maxSize) {
			// Evict least recently used
			const lru = this.accessOrder.shift();
			if (lru) this.cache.delete(lru);
		}
		this.cache.set(key, value);
		this.accessOrder.push(key);
	}
}
