import { IndirectionLayer } from './indirection-layer.js';

export interface ArrayStore {
	get: (pointer: string) => unknown;
	set: (pointer: string, value: unknown) => void;
	delete: (pointer: string) => boolean;
}

export type CompareFn<T = unknown> = (a: T, b: T) => number;

export type ShuffleRng = () => number;

export class SmartArray {
	private store: ArrayStore;
	private pointer: string;
	private indirection: IndirectionLayer;

	constructor(store: ArrayStore, pointer: string) {
		this.store = store;
		this.pointer = pointer;
		this.indirection = new IndirectionLayer(0);
	}

	get length(): number {
		return this.indirection.length;
	}

	push(value: unknown): number {
		const oldLength = this.indirection.length;
		const physical = this.indirection.pushPhysical();
		this.store.set(`${this.pointer}/_p/${physical}`, value);
		this.store.set(`${this.pointer}/${this.indirection.length - 1}`, value);
		this.deleteTrailingLogical(oldLength);
		return this.indirection.length;
	}

	get(index: number): unknown {
		return this.store.get(`${this.pointer}/${index}`);
	}

	pop(): unknown {
		if (this.indirection.length === 0) return undefined;
		const idx = this.indirection.length - 1;
		const v = this.get(idx);
		this.splice(idx, 1);
		return v;
	}

	shift(): unknown {
		if (this.indirection.length === 0) return undefined;
		const v = this.get(0);
		this.splice(0, 1);
		return v;
	}

	unshift(...values: unknown[]): number {
		this.splice(0, 0, ...values);
		return this.indirection.length;
	}

	splice(index: number, deleteCount: number, ...items: unknown[]): unknown[] {
		const oldLength = this.indirection.length;
		if (oldLength === 0) {
			if (items.length > 0) {
				for (const it of items) this.push(it);
			}
			return [];
		}

		// Normalize index
		if (index < 0) index = Math.max(0, oldLength + index);
		if (index > oldLength) index = oldLength;

		// Normalize deleteCount
		deleteCount = Math.max(0, Math.min(deleteCount, oldLength - index));

		const removed: unknown[] = [];

		// Capture removed values from logical view
		for (let i = 0; i < deleteCount; i++) {
			removed.push(this.get(index + i));
		}

		// Delete physical slots
		for (let i = 0; i < deleteCount; i++) {
			const phys = this.indirection.removeAt(index);
			this.store.delete(`${this.pointer}/_p/${phys}`);
		}

		// Insert physical slots
		for (let i = 0; i < items.length; i++) {
			const phys = this.indirection.insertAt(index + i);
			this.store.set(`${this.pointer}/_p/${phys}`, items[i]);
		}

		this.syncLogical(oldLength);
		return removed;
	}

	sort(compareFn?: CompareFn): void {
		const values = this.toArray();
		values.sort(compareFn as any);
		this.writeFromArray(values);
	}

	reverse(): void {
		const values = this.toArray().reverse();
		this.writeFromArray(values);
	}

	shuffle(rng: ShuffleRng = Math.random): void {
		const values = this.toArray();
		for (let i = values.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			const tmp = values[i];
			values[i] = values[j];
			values[j] = tmp;
		}
		this.writeFromArray(values);
	}

	toArray(): unknown[] {
		const out: unknown[] = [];
		for (let i = 0; i < this.indirection.length; i++) out.push(this.get(i));
		return out;
	}

	toPointerMap(): Map<string, unknown> {
		const map = new Map<string, unknown>();
		for (let i = 0; i < this.indirection.length; i++) {
			map.set(`${this.pointer}/${i}`, this.get(i));
		}
		return map;
	}

	private writeFromArray(values: unknown[]): void {
		const oldLength = this.indirection.length;
		const len = values.length;

		// If lengths differ, use splice to keep physical storage consistent.
		if (len !== oldLength) {
			this.splice(0, oldLength, ...values);
			return;
		}

		for (let i = 0; i < len; i++) {
			const phys = this.indirection.getPhysical(i);
			this.store.set(`${this.pointer}/_p/${phys}`, values[i]);
			this.store.set(`${this.pointer}/${i}`, values[i]);
		}
	}

	private syncLogical(oldLength: number): void {
		// Rewrite logical projection (keeps physical slots stable; logical pointers updated)
		for (let i = 0; i < this.indirection.length; i++) {
			const phys = this.indirection.getPhysical(i);
			const v = this.store.get(`${this.pointer}/_p/${phys}`);
			this.store.set(`${this.pointer}/${i}`, v);
		}
		this.deleteTrailingLogical(oldLength);
	}

	private deleteTrailingLogical(oldLength: number): void {
		for (let i = this.indirection.length; i < oldLength; i++) {
			this.store.delete(`${this.pointer}/${i}`);
		}
	}
}
