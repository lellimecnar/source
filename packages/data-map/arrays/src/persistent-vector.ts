export class PersistentVector<T> {
	private data: readonly T[];

	constructor(data: readonly T[] = []) {
		this.data = data;
	}

	get length(): number {
		return this.data.length;
	}

	get(index: number): T | undefined {
		return this.data[index];
	}

	push(value: T): PersistentVector<T> {
		return new PersistentVector([...this.data, value]);
	}

	set(index: number, value: T): PersistentVector<T> {
		const next = this.data.slice();
		next[index] = value;
		return new PersistentVector(next);
	}

	slice(start: number, end?: number): PersistentVector<T> {
		return new PersistentVector(this.data.slice(start, end));
	}

	toArray(): T[] {
		return [...this.data];
	}
}
