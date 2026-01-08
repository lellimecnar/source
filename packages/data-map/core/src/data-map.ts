import type { DataMapComputeHost } from '@data-map/computed';
import { pointerComputed, queryComputed } from '@data-map/computed';
import { queryFlat } from '@data-map/path';
import { batch } from '@data-map/signals';
import { FlatStore } from '@data-map/storage';
import { SubscriptionEngine } from '@data-map/subscriptions';

import type { Pointer, SubscribeEvent, Unsubscribe } from './types.js';

export class DataMap<T = unknown> {
	private store: FlatStore;
	private subs: SubscriptionEngine;

	constructor(initial?: T) {
		this.store = new FlatStore(initial);
		this.subs = new SubscriptionEngine();
	}

	get(pointer: Pointer): unknown {
		return this.store.get(pointer);
	}

	set(pointer: Pointer, value: unknown): void {
		this.store.set(pointer, value);
		this.subs.notify(pointer, value);
	}

	delete(pointer: Pointer): boolean {
		const existed = this.store.delete(pointer);
		if (existed) this.subs.notify(pointer, undefined);
		return existed;
	}

	subscribe(
		pointer: Pointer,
		cb: (event: SubscribeEvent) => void,
	): Unsubscribe {
		return this.subs.subscribePointer(pointer, cb);
	}

	subscribePattern(
		path: string,
		cb: (event: SubscribeEvent) => void,
	): Unsubscribe {
		return this.subs.subscribePattern(path, cb);
	}

	query(path: string): { values: unknown[]; pointers: string[] } {
		return queryFlat(this.store, path);
	}

	queryPointers(path: string): string[] {
		return this.query(path).pointers;
	}

	computedPointer<V = unknown>(pointer: Pointer) {
		const host: DataMapComputeHost = {
			get: (p: Pointer) => this.get(p),
			subscribePointer: (p: Pointer, cb: () => void) =>
				this.subscribe(p, () => {
					cb();
				}),
			queryPointers: (p: Pointer) => this.queryPointers(p),
			subscribePattern: (p: Pointer, cb: () => void) =>
				this.subscribePattern(p, () => {
					cb();
				}),
		};
		return pointerComputed<V>(host, pointer);
	}

	computedQuery<V = unknown>(path: string) {
		const host: DataMapComputeHost = {
			get: (p: Pointer) => this.get(p),
			subscribePointer: (p: Pointer, cb: () => void) =>
				this.subscribe(p, () => {
					cb();
				}),
			queryPointers: (p: Pointer) => this.queryPointers(p),
			subscribePattern: (p: Pointer, cb: () => void) =>
				this.subscribePattern(p, () => {
					cb();
				}),
		};
		return queryComputed<V>(host, path);
	}

	batchUpdate(fn: () => void): void {
		batch(fn);
	}

	snapshot(): Map<string, unknown> {
		return this.store.snapshot().data;
	}

	toObject(): unknown {
		return this.store.toObject();
	}
}
