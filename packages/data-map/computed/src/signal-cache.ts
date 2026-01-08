import { signal, type Signal } from '@data-map/signals';

import type { DataMapComputeHost, Pointer } from './types.js';

interface CacheEntry {
	sig: Signal<unknown>;
	unsub: () => void;
}

export class SignalCache {
	private host: DataMapComputeHost;
	private cache = new Map<Pointer, CacheEntry>();

	constructor(host: DataMapComputeHost) {
		this.host = host;
	}

	signalFor(pointer: Pointer): Signal<unknown> {
		const existing = this.cache.get(pointer);
		if (existing) return existing.sig;

		const sig = signal(this.host.get(pointer));
		const unsub = this.host.subscribePointer(pointer, () => {
			sig.value = this.host.get(pointer);
		});

		this.cache.set(pointer, { sig, unsub });
		return sig;
	}

	clearCache(): void {
		for (const { unsub } of this.cache.values()) unsub();
		this.cache.clear();
	}
}
