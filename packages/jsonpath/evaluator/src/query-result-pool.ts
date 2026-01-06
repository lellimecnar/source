import type { PathSegment } from '@jsonpath/core';

import type { QueryResultNode } from './query-result.js';
import { materializePath, pointerStringForNode } from './query-result.js';

interface AcquireArgs {
	value: any;
	root: any;
	parent?: any;
	parentKey?: PathSegment;
	pathParent?: QueryResultNode;
	pathSegment?: PathSegment;
}

class PooledNode implements QueryResultNode {
	value: any;
	root: any;
	parent?: any;
	parentKey?: PathSegment;

	_pathParent?: QueryResultNode;
	_pathSegment?: PathSegment;
	_cachedPath?: PathSegment[];
	_cachedPointer?: string;
	_depth?: number;

	get path(): readonly PathSegment[] {
		return materializePath(this);
	}
}

export class QueryResultPool {
	private pool: PooledNode[] = [];
	private index = 0;

	reset(): void {
		this.index = 0;
	}

	acquire(args: AcquireArgs): QueryResultNode {
		let node = this.pool[this.index];
		if (!node) {
			node = new PooledNode();
			this.pool.push(node);
		}
		this.index++;

		node.value = args.value;
		node.root = args.root;
		node.parent = args.parent;
		node.parentKey = args.parentKey;
		node._pathParent = args.pathParent;
		node._pathSegment = args.pathSegment;

		node._cachedPath = undefined;
		node._cachedPointer = undefined;

		const parentDepth = args.pathParent?._depth ?? 0;
		node._depth = parentDepth + (args.pathSegment === undefined ? 0 : 1);

		return node;
	}

	ownFrom(node: QueryResultNode): QueryResultNode {
		const owned = new PooledNode();
		owned.value = node.value;
		owned.root = node.root;
		owned.parent = node.parent;
		owned.parentKey = node.parentKey;

		const path = materializePath(node);
		owned._cachedPath = path;
		owned._depth = node._depth ?? path.length;

		owned._cachedPointer = node._cachedPointer;
		if (!owned._cachedPointer && node._pathSegment !== undefined) {
			owned._cachedPointer = pointerStringForNode(node);
		}

		owned._pathParent = undefined;
		owned._pathSegment = undefined;
		return owned;
	}
}
