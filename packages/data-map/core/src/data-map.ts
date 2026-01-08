import { SmartArray } from '@data-map/arrays';
import type { DataMapComputeHost } from '@data-map/computed';
import {
	multiPointerComputed,
	pointerComputed,
	queryComputed,
} from '@data-map/computed';
import { queryFlat } from '@data-map/path';
import { batch as signalBatch } from '@data-map/signals';
import { FlatStore } from '@data-map/storage';
import type {
	SubscriptionEvent,
	SubscriptionOptions,
} from '@data-map/subscriptions';
import { SubscriptionEngine } from '@data-map/subscriptions';

import type {
	Pointer,
	SubscribeEvent,
	SubscribeOptions,
	Unsubscribe,
} from './types.js';

function isPointer(input: string): boolean {
	return input === '' || input.startsWith('/');
}

export class DataMap<T = unknown> {
	private store: FlatStore;
	private subs: SubscriptionEngine;
	private arrays = new Map<Pointer, SmartArray>();
	private batching = 0;
	private pending = new Map<
		Pointer,
		{ value: unknown; previousValue: unknown }
	>();

	constructor(initial?: T) {
		this.store = new FlatStore(initial);
		this.subs = new SubscriptionEngine();
	}

	get(pointer: Pointer): unknown {
		return this.store.get(pointer);
	}

	has(pointer: Pointer): boolean {
		return this.store.has(pointer);
	}

	set(pointer: Pointer, value: unknown): void {
		const previousValue = this.store.get(pointer);
		this.store.set(pointer, value);
		this.enqueueNotify(pointer, value, previousValue);
	}

	delete(pointer: Pointer): boolean {
		const previousValue = this.store.get(pointer);
		const existed = this.store.delete(pointer);
		if (existed) this.enqueueNotify(pointer, undefined, previousValue);
		return existed;
	}

	fromObject(obj: T): void {
		this.store = new FlatStore(obj);
		this.arrays.clear();
		this.pending.clear();
	}

	keys(prefixOrPath?: string): string[] {
		if (!prefixOrPath) return Array.from(this.store.keys());
		if (prefixOrPath.startsWith('$')) return this.queryPointers(prefixOrPath);
		return Array.from(this.store.keys(prefixOrPath));
	}

	subscribe(
		pathOrPointer: string,
		cb: (event: SubscribeEvent) => void,
		options?: SubscribeOptions,
	): Unsubscribe {
		if (isPointer(pathOrPointer)) {
			return this.subs.subscribePointer(
				pathOrPointer,
				(e) => {
					cb(e as unknown as SubscribeEvent);
				},
				options as unknown as SubscriptionOptions,
			);
		}
		return this.subs.subscribePattern(
			pathOrPointer,
			(e) => {
				cb(e as unknown as SubscribeEvent);
			},
			options as unknown as SubscriptionOptions,
		);
	}

	query(path: string): { values: unknown[]; pointers: string[] } {
		return queryFlat(this.store, path);
	}

	queryPointers(path: string): string[] {
		return this.query(path).pointers;
	}

	computedPointer<V = unknown>(pointer: Pointer) {
		return pointerComputed<V>(this.computeHost(), pointer);
	}

	computedQuery<V = unknown>(path: string) {
		return queryComputed<V>(this.computeHost(), path);
	}

	computed<V>(pointers: Pointer[], compute: (...values: unknown[]) => V) {
		return multiPointerComputed<V>(this.computeHost(), pointers, compute);
	}

	batch(fn: () => void): void {
		this.batching++;
		signalBatch(() => {
			try {
				fn();
			} finally {
				this.batching--;
				if (this.batching === 0) this.flushPending();
			}
		});
	}

	transaction<R>(fn: () => R): R {
		// Snapshot via toObject() ensures rollback without requiring store internals.
		const before = this.store.toObject() as T;
		this.batching++;
		try {
			const result = fn();
			return result;
		} catch (err) {
			this.store = new FlatStore(before);
			this.arrays.clear();
			this.pending.clear();
			throw err;
		} finally {
			this.batching--;
			if (this.batching === 0) this.flushPending();
		}
	}

	push(arrayPointer: Pointer, ...values: unknown[]): number {
		const arr = this.getArray(arrayPointer);
		for (const v of values) arr.push(v);
		return arr.length;
	}

	pop(arrayPointer: Pointer): unknown {
		return this.getArray(arrayPointer).pop();
	}

	shift(arrayPointer: Pointer): unknown {
		return this.getArray(arrayPointer).shift();
	}

	unshift(arrayPointer: Pointer, ...values: unknown[]): number {
		return this.getArray(arrayPointer).unshift(...values);
	}

	splice(
		arrayPointer: Pointer,
		index: number,
		deleteCount: number,
		...items: unknown[]
	): unknown[] {
		this.getArray(arrayPointer).splice(index, deleteCount, ...items);
	}

	sort(arrayPointer: Pointer, compareFn?: (a: any, b: any) => number): void {
		this.getArray(arrayPointer).sort(compareFn);
	}

	reverse(arrayPointer: Pointer): void {
		this.getArray(arrayPointer).reverse();
	}

	shuffle(arrayPointer: Pointer): void {
		this.getArray(arrayPointer).shuffle();
	}

	snapshot(): Map<string, unknown> {
		return this.store.snapshot().data;
	}

	toObject(): unknown {
		return this.store.toObject();
	}

	private computeHost(): DataMapComputeHost {
		return {
			get: (p: Pointer) => this.get(p),
			subscribePointer: (p: Pointer, cb: () => void) =>
				this.subscribe(p, () => {
					cb();
				}),
			queryPointers: (p: Pointer) => this.queryPointers(p),
			subscribePattern: (p: Pointer, cb: () => void) =>
				this.subscribe(p, () => {
					cb();
				}),
		};
	}

	private getArray(pointer: Pointer): SmartArray {
		const existing = this.arrays.get(pointer);
		if (existing) return existing;
		const arr = new SmartArray(
			{
				get: (p) => this.get(p),
				set: (p, v) => {
					this.set(p, v);
				},
				delete: (p) => this.delete(p),
			},
			pointer,
		);
		this.arrays.set(pointer, arr);
		return arr;
	}

	private enqueueNotify(
		pointer: Pointer,
		value: unknown,
		previousValue: unknown,
	): void {
		this.pending.set(pointer, { value, previousValue });
		if (this.batching > 0) return;
		this.flushPending();
	}

	private flushPending(): void {
		if (this.pending.size === 0) return;
		const items = Array.from(this.pending.entries());
		this.pending.clear();
		for (const [pointer, { value, previousValue }] of items) {
			this.subs.notify(pointer, value, previousValue);
		}
	}
}
