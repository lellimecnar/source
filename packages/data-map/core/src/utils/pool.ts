/**
 * Generic object pool for reducing GC pressure on hot paths.
 */
export class ObjectPool<T> {
	private readonly pool: T[] = [];
	private readonly create: () => T;
	private readonly reset: (obj: T) => void;
	private readonly maxSize: number;

	constructor(options: {
		create: () => T;
		reset: (obj: T) => void;
		maxSize?: number;
	}) {
		this.create = options.create;
		this.reset = options.reset;
		this.maxSize = options.maxSize ?? 1000;
	}

	acquire(): T {
		return this.pool.pop() ?? this.create();
	}

	release(obj: T): void {
		if (this.pool.length >= this.maxSize) return;
		this.reset(obj);
		this.pool.push(obj);
	}
}
