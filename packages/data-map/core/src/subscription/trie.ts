export class PathTrie<V> {
	private readonly children = new Map<string, PathTrie<V>>();
	private readonly values = new Set<V>();

	insert(path: string, value: V): void {
		const segments = path.split('/').filter(Boolean);
		let node: PathTrie<V> = this;
		for (const seg of segments) {
			let child = node.children.get(seg);
			if (!child) {
				child = new PathTrie<V>();
				node.children.set(seg, child);
			}
			node = child;
		}
		node.values.add(value);
	}

	matchPrefix(path: string): Set<V> {
		const matched = new Set<V>();
		const segments = path.split('/').filter(Boolean);
		let node: PathTrie<V> = this;

		for (const seg of segments) {
			for (const v of node.values) matched.add(v);
			const next = node.children.get(seg);
			if (!next) return matched;
			node = next;
		}

		for (const v of node.values) matched.add(v);
		return matched;
	}
}
