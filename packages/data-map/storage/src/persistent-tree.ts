export interface PersistentNode<T> {
	readonly value?: T;
	readonly children: ReadonlyMap<string, PersistentNode<T>>;
}

export function emptyNode<T>(): PersistentNode<T> {
	return { children: new Map() };
}

export function updatePath<T>(
	root: PersistentNode<T>,
	path: readonly string[],
	value: T,
): PersistentNode<T> {
	if (path.length === 0) {
		return { value, children: root.children };
	}

	const [head, ...tail] = path;
	const existingChild = root.children.get(head) ?? emptyNode<T>();
	const nextChild = updatePath(existingChild, tail, value);
	const nextChildren = new Map(root.children);
	nextChildren.set(head, nextChild);
	return { value: root.value, children: nextChildren };
}

export function getPath<T>(
	root: PersistentNode<T>,
	path: readonly string[],
): T | undefined {
	let cur: PersistentNode<T> | undefined = root;
	for (const seg of path) {
		cur = cur.children.get(seg);
		if (!cur) return undefined;
	}
	return cur.value;
}
