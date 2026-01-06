/**
 * @jsonpath/evaluator
 *
 * Result class for JSONPath queries.
 *
 * @packageDocumentation
 */

import type {
	Path,
	PathSegment,
	QueryNode as CoreQueryNode,
	QueryResult as CoreQueryResult,
} from '@jsonpath/core';
import { JSONPointer } from '@jsonpath/pointer';

export interface QueryResultNode<T = unknown> extends CoreQueryNode<T> {
	// Backwards-compatible API: `path` is still a property.
	readonly path: Path;

	// Internal lazy-path chain
	_pathParent?: QueryResultNode | undefined;
	_pathSegment?: PathSegment | undefined;
	_cachedPath?: PathSegment[] | undefined;
	_cachedPointer?: string | undefined;
	_depth?: number | undefined;
}

export function materializePath(node: QueryResultNode): PathSegment[] {
	if (node._cachedPath) return node._cachedPath;

	const segments: PathSegment[] = [];
	let curr: QueryResultNode | undefined = node;
	while (curr?._pathSegment !== undefined) {
		segments.push(curr._pathSegment);
		curr = curr._pathParent;
	}
	segments.reverse();

	node._cachedPath = segments;
	node._depth ??= segments.length;

	return segments;
}

function escapeJsonPointerSegmentFromPathSegment(segment: PathSegment): string {
	return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

export function pointerStringForNode(node: QueryResultNode): string {
	if (node._cachedPointer) return node._cachedPointer;

	// Root pointer
	if (node._pathSegment === undefined) {
		// Match existing QueryResult.pointerStrings() behavior: root is "".
		node._cachedPointer = '';
		return '';
	}

	// Collect segments without materializing `node.path`.
	const segs: PathSegment[] = [];
	let curr: QueryResultNode | undefined = node;
	while (curr?._pathSegment !== undefined) {
		segs.push(curr._pathSegment);
		curr = curr._pathParent;
	}
	segs.reverse();

	let out = '';
	for (const s of segs) out += `/${escapeJsonPointerSegmentFromPathSegment(s)}`;

	node._cachedPointer = out;
	return out;
}

function escapeNormalizedPathName(name: string): string {
	return name
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\x08/g, '\\b')
		.replace(/\x0c/g, '\\f')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t')
		.replace(/[\u0000-\u001f]/g, (c) => {
			return `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
		});
}

function pathToNormalizedPath(path: readonly PathSegment[]): string {
	// RFC 9535 Section 2.2:
	// - Use bracket notation for all segments
	// - Names use single quotes
	let out = '$';
	for (const seg of path) {
		if (typeof seg === 'number') {
			out += `[${seg}]`;
		} else {
			out += `['${escapeNormalizedPathName(seg)}']`;
		}
	}
	return out;
}

export class QueryResult<T = unknown> implements CoreQueryResult<T> {
	constructor(private readonly results: QueryResultNode<T>[]) {}

	values(): T[] {
		return this.results.map((r) => r.value);
	}

	paths(): PathSegment[][] {
		return this.results.map((r) => [...r.path]);
	}

	pointers(): JSONPointer[] {
		return this.results.map(
			(r) => new JSONPointer(r._cachedPointer ?? pointerStringForNode(r)),
		);
	}

	pointerStrings(): string[] {
		return this.results.map((r) => r._cachedPointer ?? pointerStringForNode(r));
	}

	normalizedPaths(): string[] {
		return this.results.map((r) => pathToNormalizedPath(r.path));
	}

	nodes(): QueryResultNode<T>[] {
		return [...this.results];
	}

	first(): QueryResultNode<T> | undefined {
		return this.results[0];
	}

	last(): QueryResultNode<T> | undefined {
		return this.results[this.results.length - 1];
	}

	isEmpty(): boolean {
		return this.results.length === 0;
	}

	get length(): number {
		return this.results.length;
	}

	map<U>(fn: (value: T, node: QueryResultNode<T>) => U): U[] {
		return this.results.map((n) => fn(n.value, n));
	}

	filter(fn: (value: T, node: QueryResultNode<T>) => boolean): QueryResult<T> {
		return new QueryResult(this.results.filter((n) => fn(n.value, n)));
	}

	forEach(fn: (value: T, node: QueryResultNode<T>) => void): void {
		for (const n of this.results) fn(n.value, n);
	}

	parents(): QueryResult {
		const seen = new Set<string>();
		const parentNodes: QueryResultNode[] = [];

		for (const n of this.results) {
			if (n.parent === undefined) continue;
			const parentPath = n.path.slice(0, -1);
			const key =
				parentPath.length === 0
					? ''
					: pointerStringForNode(n).slice(0, -String(n.parentKey).length - 1);
			if (seen.has(key)) continue;
			seen.add(key);

			parentNodes.push({
				value: n.parent,
				path: parentPath,
				root: n.root,
			});
		}

		return new QueryResult(parentNodes);
	}

	[Symbol.iterator](): Iterator<QueryResultNode<T>> {
		return this.results[Symbol.iterator]();
	}
}
