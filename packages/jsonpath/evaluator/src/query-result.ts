/**
 * @jsonpath/evaluator
 *
 * Result class for JSONPath queries.
 *
 * @packageDocumentation
 */

import type {
	PathSegment,
	QueryNode as CoreQueryNode,
	QueryResult as CoreQueryResult,
} from '@jsonpath/core';

export type QueryResultNode<T = unknown> = CoreQueryNode<T>;

function escapeJsonPointerSegment(segment: string): string {
	return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function pathToPointer(path: readonly PathSegment[]): string {
	if (path.length === 0) return '';
	return `/${path
		.map((seg) =>
			escapeJsonPointerSegment(typeof seg === 'number' ? String(seg) : seg),
		)
		.join('/')}`;
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

	pointers(): string[] {
		return this.results.map((r) => pathToPointer(r.path));
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
			const key = pathToPointer(parentPath);
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
