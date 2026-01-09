import { validateQuery } from '@jsonpath/jsonpath';

import type { Pointer } from './types.js';

type Node<T> = {
	id: number;
	children: Map<string, Node<T>>;
	wildcardChild: Node<T> | null;
	recursiveChild: Node<T> | null;
	values: Set<T>;
};

function createNode<T>(id: number): Node<T> {
	return {
		id,
		children: new Map(),
		wildcardChild: null,
		recursiveChild: null,
		values: new Set(),
	};
}

function patternToSegments(pattern: string): string[] {
	const v = validateQuery(pattern);
	if (!v.valid) throw new Error(v.error ?? 'Invalid JSONPath');

	// Special-case `$..name` style patterns (recursive descent).
	if (pattern.startsWith('$..')) {
		const tail = pattern.slice(3);
		const seg = tail.startsWith('.') ? tail.slice(1) : tail;
		if (!seg) return ['**'];
		return ['**', seg];
	}

	// Minimal JSONPath pattern support:
	// - $.a.b
	// - $.a[*].b
	// - $.a.*.b
	let ptrish = pattern;
	ptrish = ptrish.replace(/^\$\.?/, '/');
	ptrish = ptrish.replaceAll('..', '/**/');
	ptrish = ptrish.replaceAll('[*]', '/*');
	ptrish = ptrish.replaceAll('.', '/');

	return ptrish.split('/').filter(Boolean);
}

function isTrieEligible(pattern: string): boolean {
	// Keep trie semantics aligned with the existing minimal compiler:
	// Anything outside the minimal subset is better handled by regex fallback.
	if (pattern.includes('?') || pattern.includes('(') || pattern.includes(')')) {
		return false;
	}
	// Only allow [*] bracket form; reject other bracket constructs.
	const bracket = pattern.match(/\[[^\]]*\]/g) ?? [];
	for (const b of bracket) {
		if (b !== '[*]') return false;
	}
	return true;
}

export class PatternTrie<T> {
	private nextId = 1;
	private root: Node<T> = createNode(0);

	add(pattern: string, value: T): { segments: string[]; eligible: boolean } {
		const eligible = isTrieEligible(pattern);
		if (!eligible) return { segments: [], eligible: false };
		const segments = patternToSegments(pattern);
		let node = this.root;
		for (const seg of segments) {
			if (seg === '*') {
				node.wildcardChild ??= createNode(this.nextId++);
				node = node.wildcardChild;
				continue;
			}

			if (seg === '**') {
				if (!node.recursiveChild) {
					node.recursiveChild = createNode(this.nextId++);
					// Allow the recursiveChild to continue matching itself
					node.recursiveChild.recursiveChild = node.recursiveChild;
				}
				node = node.recursiveChild;
				continue;
			}

			let child = node.children.get(seg);
			if (!child) {
				child = createNode(this.nextId++);
				node.children.set(seg, child);
			}
			node = child;
		}
		node.values.add(value);
		return { segments, eligible: true };
	}

	remove(segments: string[], value: T): void {
		if (segments.length === 0) return;
		const path: Node<T>[] = [this.root];
		let node = this.root;

		for (const seg of segments) {
			let next: Node<T> | null = null;
			if (seg === '*') next = node.wildcardChild;
			else if (seg === '**') next = node.recursiveChild;
			else next = node.children.get(seg) ?? null;
			if (!next) return;
			node = next;
			path.push(node);
		}

		node.values.delete(value);

		// Best-effort prune: walk backwards and remove empty leaf edges.
		for (let i = segments.length - 1; i >= 0; i--) {
			const parent = path[i]!;
			const child = path[i + 1]!;
			const seg = segments[i]!;

			const childEmpty =
				child.values.size === 0 &&
				child.children.size === 0 &&
				!child.wildcardChild &&
				!child.recursiveChild;

			if (!childEmpty) break;

			if (seg === '*') parent.wildcardChild = null;
			else if (seg === '**') parent.recursiveChild = null;
			else parent.children.delete(seg);
		}
	}

	match(pointer: Pointer): Set<T> {
		const segments = pointer.split('/').filter(Boolean);
		const results = new Set<T>();

		type State = { node: Node<T>; index: number };
		const stack: State[] = [{ node: this.root, index: 0 }];
		const visited = new Set<string>();

		while (stack.length > 0) {
			const state = stack.pop();
			if (!state) break;
			const { node, index } = state;
			const key = `${node.id}:${index}`;
			if (visited.has(key)) continue;
			visited.add(key);

			if (index === segments.length) {
				for (const v of node.values) results.add(v);

				// `**` can also match empty suffix.
				if (node.recursiveChild) {
					stack.push({ node: node.recursiveChild, index });
				}
				continue;
			}

			const seg = segments[index]!;

			const exact = node.children.get(seg);
			if (exact) stack.push({ node: exact, index: index + 1 });

			if (node.wildcardChild) {
				stack.push({ node: node.wildcardChild, index: index + 1 });
			}

			if (node.recursiveChild) {
				// `**` matches zero segments: advance to the recursive child
				stack.push({ node: node.recursiveChild, index });
				// `**` matches one or more segments: stay in recursive child, advance pointer
				stack.push({ node: node.recursiveChild, index: index + 1 });
			}
		}

		return results;
	}
}
