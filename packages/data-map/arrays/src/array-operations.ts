import type { FlatStore } from '@data-map/storage';

import { IndirectionLayer } from './indirection-layer.js';

export class SmartArray {
	private store: FlatStore;
	private pointer: string;
	private indirection: IndirectionLayer;

	constructor(store: FlatStore, pointer: string) {
		this.store = store;
		this.pointer = pointer;
		this.indirection = new IndirectionLayer(0);
	}

	push(value: unknown): void {
		const physical = this.indirection.pushPhysical();
		this.store.set(`${this.pointer}/_p/${physical}`, value);
		this.store.set(`${this.pointer}/${this.indirection.length - 1}`, value);
	}

	get(index: number): unknown {
		return this.store.get(`${this.pointer}/${index}`);
	}

	splice(index: number, deleteCount: number, ...items: unknown[]): void {
		for (let i = 0; i < deleteCount; i++) {
			const phys = this.indirection.removeAt(index);
			this.store.delete(`${this.pointer}/_p/${phys}`);
		}
		for (let i = 0; i < items.length; i++) {
			const phys = this.indirection.insertAt(index + i);
			this.store.set(`${this.pointer}/_p/${phys}`, items[i]);
		}

		// Rewrite logical projection (keeps physical slots stable; logical pointers updated)
		for (let i = 0; i < this.indirection.length; i++) {
			const phys = this.indirection.getPhysical(i);
			const v = this.store.get(`${this.pointer}/_p/${phys}`);
			this.store.set(`${this.pointer}/${i}`, v);
		}
	}
}
