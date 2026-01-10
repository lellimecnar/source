import { pointerToSegments, segmentsToPointer } from './pointer-utils.js';
import type { Pointer } from './types.js';

export class PrefixIndex {
	private byPrefix = new Map<Pointer, Set<Pointer>>();
	private childrenByPrefix = new Map<Pointer, Set<string>>();

	clear(): void {
		this.byPrefix.clear();
		this.childrenByPrefix.clear();
	}

	rebuild(keys: Iterable<Pointer>): void {
		this.clear();
		for (const key of keys) this.add(key);
	}

	add(pointer: Pointer): void {
		const segs = pointerToSegments(pointer);
		for (let i = 0; i <= segs.length; i++) {
			const prefix = segmentsToPointer(segs.slice(0, i));
			let set = this.byPrefix.get(prefix);
			if (!set) {
				set = new Set();
				this.byPrefix.set(prefix, set);
			}
			set.add(pointer);

			// Track immediate child segments per prefix.
			const child = segs[i];
			if (typeof child === 'string') {
				let children = this.childrenByPrefix.get(prefix);
				if (!children) {
					children = new Set();
					this.childrenByPrefix.set(prefix, children);
				}
				children.add(child);
			}
		}
	}

	remove(pointer: Pointer): void {
		const segs = pointerToSegments(pointer);
		for (let i = 0; i <= segs.length; i++) {
			const prefix = segmentsToPointer(segs.slice(0, i));
			const set = this.byPrefix.get(prefix);
			if (!set) continue;
			set.delete(pointer);
			if (set.size === 0) this.byPrefix.delete(prefix);
		}
	}

	*keys(prefix?: Pointer): IterableIterator<Pointer> {
		const base = prefix ?? '';
		const set = this.byPrefix.get(base);
		if (!set) return;
		for (const key of set) yield key;
	}

	subtreeSize(prefix: Pointer): number {
		return this.byPrefix.get(prefix)?.size ?? 0;
	}

	childSegments(prefix: Pointer): string[] {
		return Array.from(this.childrenByPrefix.get(prefix) ?? []);
	}
}
