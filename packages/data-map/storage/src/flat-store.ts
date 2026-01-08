import { ingestNested, materializeNested } from './nested-converter.js';
import { pointerToSegments } from './pointer-utils.js';
import type { ArrayMetadata, FlatSnapshot, Pointer } from './types.js';
import { bumpVersion } from './versioning.js';

export class FlatStore {
	private data = new Map<Pointer, unknown>();
	private versions = new Map<Pointer, number>();
	private arrays = new Map<Pointer, ArrayMetadata>();
	private globalVersion = 0;

	constructor(initial?: unknown) {
		if (typeof initial !== 'undefined') {
			ingestNested(this.data, this.versions, this.arrays, initial, '');
			this.globalVersion++;
		}
	}

	get size(): number {
		return this.data.size;
	}

	get globalVersion(): number {
		return this.globalVersion;
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
		this.globalVersion++;
	}

	delete(pointer: Pointer): boolean {
		const existed = this.data.delete(pointer);
		if (existed) {
			bumpVersion(this.versions, pointer);
			this.globalVersion++;
		}
		return existed;
	}

	version(pointer: Pointer): number {
		return this.versions.get(pointer) ?? 0;
	}

	getVersion(pointer: Pointer): number {
		return this.version(pointer);
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

	getObject(pointer: Pointer): unknown {
		if (pointer === '') return materializeNested(this.data);

		const exactExists = this.data.has(pointer);
		const exactValue = this.data.get(pointer);

		const prefix = `${pointer}/`;
		let hasDescendants = false;
		for (const key of this.data.keys()) {
			if (key.startsWith(prefix)) {
				hasDescendants = true;
				break;
			}
		}

		if (!hasDescendants) {
			return exactExists ? exactValue : undefined;
		}

		const baseSegs = pointerToSegments(pointer);
		let root: any | undefined;

		for (const [ptr, value] of this.data.entries()) {
			if (!ptr.startsWith(prefix)) continue;
			const segs = pointerToSegments(ptr);
			const rel = segs.slice(baseSegs.length);
			if (rel.length === 0) continue;

			if (typeof root === 'undefined') {
				root = /^\d+$/.test(rel[0] ?? '') ? [] : {};
			}

			let cur: any = root;
			let parent: any | undefined;
			let parentKey: string | number | undefined;

			for (let i = 0; i < rel.length; i++) {
				const seg = rel[i] ?? '';
				const isLast = i === rel.length - 1;
				const nextSeg = rel[i + 1];
				const nextIsIndex =
					typeof nextSeg === 'string' && /^\d+$/.test(nextSeg);
				const isIndex = /^\d+$/.test(seg);

				if (isIndex) {
					const idx = Number(seg);
					if (!Array.isArray(cur)) {
						const nextArr: any[] = [];
						if (typeof parent === 'undefined') {
							root = nextArr;
						} else if (typeof parentKey === 'number') {
							(parent as any[])[parentKey] = nextArr;
						} else {
							parent[parentKey!] = nextArr;
						}
						cur = nextArr;
					}

					if (isLast) {
						(cur as unknown[])[idx] = value;
						break;
					}

					(cur as any[])[idx] ??= nextIsIndex ? [] : {};
					parent = cur;
					parentKey = idx;
					cur = (cur as any[])[idx];
					continue;
				}

				// object key
				if (cur === null || typeof cur !== 'object' || Array.isArray(cur)) {
					const nextObj: any = {};
					if (typeof parent === 'undefined') {
						root = nextObj;
					} else if (typeof parentKey === 'number') {
						(parent as any[])[parentKey] = nextObj;
					} else {
						parent[parentKey!] = nextObj;
					}
					cur = nextObj;
				}

				if (isLast) {
					cur[seg] = value;
					break;
				}
				cur[seg] ??= nextIsIndex ? [] : {};
				parent = cur;
				parentKey = seg;
				cur = cur[seg];
			}
		}

		return typeof root === 'undefined' ? undefined : root;
	}

	*keys(prefix?: Pointer): IterableIterator<Pointer> {
		const base = prefix ?? '';
		const basePrefix = base === '' ? '' : `${base}/`;
		const all = Array.from(this.data.keys()).sort();
		for (const key of all) {
			if (base === '') {
				yield key;
				continue;
			}
			if (key === base || key.startsWith(basePrefix)) yield key;
		}
	}

	*entries(prefix?: Pointer): IterableIterator<[Pointer, unknown]> {
		for (const key of this.keys(prefix)) {
			yield [key, this.data.get(key)];
		}
	}

	setDeep(pointer: Pointer, value: unknown): void {
		const base = pointer;
		const basePrefix = base === '' ? '' : `${base}/`;

		// Remove stale leaf keys under subtree.
		const toDelete: Pointer[] = [];
		for (const key of this.data.keys()) {
			if (base === '') {
				toDelete.push(key);
			} else if (key === base || key.startsWith(basePrefix)) {
				toDelete.push(key);
			}
		}
		for (const key of toDelete) {
			const existed = this.data.delete(key);
			if (existed) bumpVersion(this.versions, key);
		}

		// Remove stale array metadata under subtree.
		const arraysToDelete: Pointer[] = [];
		for (const key of this.arrays.keys()) {
			if (base === '') {
				arraysToDelete.push(key);
			} else if (key === base || key.startsWith(basePrefix)) {
				arraysToDelete.push(key);
			}
		}
		for (const key of arraysToDelete) this.arrays.delete(key);

		// Ingest new subtree at pointer.
		ingestNested(this.data, this.versions, this.arrays, value, base);
		this.globalVersion++;
	}

	ingest(root: unknown): void {
		ingestNested(this.data, this.versions, this.arrays, root, '');
		this.globalVersion++;
	}
}
