import type { DataMapComputeHost, Pointer } from './types.js';

export class DependencyTracker {
	private host: DataMapComputeHost;
	private unsubs: Array<() => void> = [];

	constructor(host: DataMapComputeHost) {
		this.host = host;
	}

	trackPointers(pointers: Pointer[], onInvalidate: () => void): void {
		this.dispose();
		for (const p of pointers) {
			this.unsubs.push(this.host.subscribePointer(p, onInvalidate));
		}
	}

	trackQuery(path: string, onInvalidate: () => void): void {
		this.dispose();
		const pointers = this.host.queryPointers(path);
		this.trackPointers(pointers, onInvalidate);
		this.unsubs.push(this.host.subscribePattern(path, onInvalidate));
	}

	dispose(): void {
		for (const u of this.unsubs) u();
		this.unsubs = [];
	}
}
