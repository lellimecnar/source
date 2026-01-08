import TrieMapCjs from 'mnemonist/trie-map.js';

const SENTINEL = String.fromCharCode(0);

type TrieRoot = Record<string, unknown>;

interface TrieMapLike<K extends string, V> {
	size: number;
	clear: () => void;
	set: (prefix: K, value: V) => unknown;
	update: (
		prefix: K,
		updateFunction: (oldValue: V | undefined) => V,
	) => unknown;
	get: (prefix: K) => V | undefined;
	delete: (prefix: K) => boolean;
	has: (prefix: K) => boolean;
	root: TrieRoot;
}

type TrieMapCtor = new <K extends string, V>() => TrieMapLike<K, V>;

const TrieMap = TrieMapCjs as unknown as TrieMapCtor;

export class TrieIndex<V> {
	private trie: TrieMapLike<string, V> = new TrieMap();

	clear(): void {
		this.trie.clear();
	}

	get size(): number {
		return this.trie.size;
	}

	has(key: string): boolean {
		return this.trie.has(key);
	}

	get(key: string): V | undefined {
		return this.trie.get(key);
	}

	set(key: string, value: V): void {
		this.trie.set(key, value);
	}

	delete(key: string): boolean {
		return this.trie.delete(key);
	}

	update(key: string, updateFn: (oldValue: V | undefined) => V): void {
		this.trie.update(key, updateFn);
	}

	/**
	 * Returns values whose key is a prefix of the given key.
	 *
	 * If `boundary` is provided, only prefixes ending at a boundary position are
	 * yielded (useful for JSON Pointer segment boundaries).
	 */
	prefixMatches(
		key: string,
		options?: {
			boundary?: (key: string, prefixEndIndexInclusive: number) => boolean;
		},
	): [string, V][] {
		const boundary = options?.boundary;
		const out: [string, V][] = [];

		let node: TrieRoot = this.trie.root;

		for (let i = 0; i < key.length; i++) {
			const token = key[i];
			if (token === undefined) break;
			const next = node[token];
			if (!next || typeof next !== 'object') break;
			node = next as TrieRoot;

			if (Object.prototype.hasOwnProperty.call(node, SENTINEL)) {
				if (!boundary || boundary(key, i)) {
					out.push([key.slice(0, i + 1), node[SENTINEL] as V]);
				}
			}
		}

		return out;
	}
}
