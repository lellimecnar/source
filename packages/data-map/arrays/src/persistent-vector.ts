const BITS = 5;
const WIDTH = 1 << BITS; // 32
const MASK = WIDTH - 1;

type Leaf<T> = T[];
type Node<T> = (Node<T> | Leaf<T>)[];

interface Internal<T> {
	root: Node<T>;
	tail: Leaf<T>;
	size: number;
	shift: number;
}

function cloneNode<T>(node: Node<T>): Node<T> {
	return node.slice();
}

function cloneLeaf<T>(leaf: Leaf<T>): Leaf<T> {
	return leaf.slice();
}

function newPath<T>(level: number, leaf: Leaf<T>): Node<T> {
	if (level === 0) return [leaf];
	return [newPath(level - BITS, leaf)];
}

function pushTail<T>(
	level: number,
	parent: Node<T>,
	tailNode: Leaf<T>,
	index: number,
): Node<T> {
	const ret = cloneNode(parent);
	const subIdx = (index >>> level) & MASK;

	if (level === BITS) {
		ret[subIdx] = tailNode;
		return ret;
	}

	const child = parent[subIdx];
	if (child) {
		ret[subIdx] = pushTail(level - BITS, child as Node<T>, tailNode, index);
		return ret;
	}

	ret[subIdx] = newPath(level - BITS, tailNode);
	return ret;
}

function arrayFor<T>(root: Node<T>, shift: number, index: number): Leaf<T> {
	let node: any = root;
	for (let level = shift; level > BITS; level -= BITS) {
		node = node[(index >>> level) & MASK];
	}
	return node[(index >>> BITS) & MASK] as Leaf<T>;
}

function doAssoc<T>(
	level: number,
	node: Node<T>,
	index: number,
	value: T,
): Node<T> {
	const ret = cloneNode(node);
	const subIdx = (index >>> level) & MASK;
	if (level === BITS) {
		const leaf = node[subIdx] as Leaf<T>;
		const nextLeaf = cloneLeaf(leaf);
		nextLeaf[index & MASK] = value;
		ret[subIdx] = nextLeaf;
		return ret;
	}

	ret[subIdx] = doAssoc(level - BITS, node[subIdx] as Node<T>, index, value);
	return ret;
}

export class PersistentVector<T> {
	private readonly root: Node<T>;
	private readonly tail: Leaf<T>;
	private readonly size: number;
	private readonly shift: number;

	constructor(data: readonly T[] = [], internal?: Internal<T>) {
		if (internal) {
			this.root = internal.root;
			this.tail = internal.tail;
			this.size = internal.size;
			this.shift = internal.shift;
			return;
		}

		let v = PersistentVector.empty<T>();
		for (const x of data) v = v.push(x);
		this.root = v.root;
		this.tail = v.tail;
		this.size = v.size;
		this.shift = v.shift;
	}

	private static empty<T>(): PersistentVector<T> {
		return new PersistentVector<T>([], {
			root: [],
			tail: [],
			size: 0,
			shift: BITS,
		});
	}

	private static fromInternal<T>(internal: Internal<T>): PersistentVector<T> {
		return new PersistentVector<T>([], internal);
	}

	get length(): number {
		return this.size;
	}

	get(index: number): T | undefined {
		if (index < 0 || index >= this.size) return undefined;
		if (index >= this.tailOffset()) {
			return this.tail[index & MASK];
		}
		const leaf = arrayFor(this.root, this.shift, index);
		return leaf[index & MASK];
	}

	push(value: T): PersistentVector<T> {
		if (this.tail.length < WIDTH) {
			const nextTail = this.tail.concat([value]);
			return PersistentVector.fromInternal({
				root: this.root,
				tail: nextTail,
				size: this.size + 1,
				shift: this.shift,
			});
		}

		const tailNode = this.tail;
		const newTail: Leaf<T> = [value];

		let newRoot: Node<T>;
		let newShift = this.shift;

		const leafIdx = this.size >> BITS;
		const indexNode = leafIdx >>> this.shift;

		if (indexNode > 0) {
			// Tree overflow - need to grow
			newRoot = [this.root];
			newRoot.push(newPath(this.shift, tailNode));
			newShift += BITS;
		} else {
			// Tree still has room
			newRoot = pushTail(this.shift, this.root, tailNode, this.size - 1);
		}

		return PersistentVector.fromInternal({
			root: newRoot,
			tail: newTail,
			size: this.size + 1,
			shift: newShift,
		});
	}

	set(index: number, value: T): PersistentVector<T> {
		if (index < 0 || index >= this.size) {
			throw new RangeError(`Index ${index} out of bounds`);
		}
		if (index >= this.tailOffset()) {
			const nextTail = cloneLeaf(this.tail);
			nextTail[index & MASK] = value;
			return PersistentVector.fromInternal({
				root: this.root,
				tail: nextTail,
				size: this.size,
				shift: this.shift,
			});
		}

		const nextRoot = doAssoc(this.shift, this.root, index, value);
		return PersistentVector.fromInternal({
			root: nextRoot,
			tail: this.tail,
			size: this.size,
			shift: this.shift,
		});
	}

	slice(start: number, end?: number): PersistentVector<T> {
		return new PersistentVector(this.toArray().slice(start, end));
	}

	toArray(): T[] {
		const out: T[] = [];
		for (let i = 0; i < this.size; i++) out.push(this.get(i)!);
		return out;
	}

	private tailOffset(): number {
		return this.size - this.tail.length;
	}
}
