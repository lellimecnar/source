import type { ArrayMetadata, FlatSnapshot, Pointer } from './types.js';
import { bumpVersion } from './versioning.js';
import { ingestNested, materializeNested } from './nested-converter.js';

export class FlatStore {
	private data = new Map<Pointer, unknown>();
	private versions = new Map<Pointer, number>();
	private arrays = new Map<Pointer, ArrayMetadata>();

	constructor(initial?: unknown) {
		if (typeof initial !== 'undefined') {
			ingestNested(this.data, this.versions, this.arrays, initial, '');
		}
	}

	get(pointer: Pointer): unknown {
		return this.data.get(pointer);
	}

	has(pointer: Pointer): boolean {
		return this.data.has(pointer);
	}

	set(pointer: Pointer, value: unknown): void {
		this.data.set(pointer, value);
		bumpVersion(this.versions, pointer);
	}

	delete(pointer: Pointer): boolean {
		const existed = this.data.delete(pointer);
		if (existed) bumpVersion(this.versions, pointer);
		return existed;
	}

	version(pointer: Pointer): number {
		return this.versions.get(pointer) ?? 0;
	}

	snapshot(): FlatSnapshot {
		return {
			data: new Map(this.data),
			versions: new Map(this.versions),
			arrays: new Map(this.arrays),
		};
	}

	toObject(): unknown {
		return materializeNested(this.data);
	}

	ingest(root: unknown): void {
		ingestNested(this.data, this.versions, this.arrays, root, '');
	}
}
