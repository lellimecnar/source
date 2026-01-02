import { JSONPointer, jsonpatch, jsonpath, type JSONValue } from 'json-p3';

import { UISpecError } from './errors';
import { createEmitter, type Observable, type Unsubscribe } from './observable';
import {
	makeMergeOps,
	makePushOps,
	makeRemoveOps,
	makeSetOps,
} from './patch-helpers';

export type JsonPatchOperation =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: unknown };

export interface UISpecStore {
	get: <T = unknown>(path: string) => T;
	select: <T = unknown>(path: string) => Observable<T>;
	patch: (operations: JsonPatchOperation[]) => void;
	set: (path: string, value: unknown) => void;
	update: (path: string, updater: (current: unknown) => unknown) => void;
	merge: (path: string, partial: Record<string, unknown>) => void;
	push: (path: string, ...items: unknown[]) => void;
	remove: (path: string, predicate: (item: unknown) => boolean) => void;
	subscribe: (listener: () => void) => Unsubscribe;
	getDocument: () => unknown;
}

function findSinglePointer(
	document: unknown,
	path: string,
): { pointer: string; value: unknown } {
	if (!jsonpath.query) {
		throw new UISpecError(
			'UI_SPEC_JSONP3_API_MISSING',
			'json-p3 jsonpath.query is missing',
		);
	}

	const nodes = jsonpath.query(path, document as JSONValue);
	if (nodes.length === 0) {
		throw new UISpecError(
			'UI_SPEC_PATH_NOT_FOUND',
			`No match for JSONPath: ${path}`,
			{
				path,
			},
		);
	}
	if (nodes.length > 1) {
		throw new UISpecError(
			'UI_SPEC_PATH_NOT_UNIQUE',
			`Multiple matches for JSONPath: ${path}`,
			{
				path,
				matches: nodes.length,
			},
		);
	}

	const node = nodes.nodes[0]!;
	return { pointer: node.toPointer().toString(), value: node.value };
}

export function createUISpecStore(initialDocument: unknown): UISpecStore {
	let document = initialDocument;
	const emitter = createEmitter<void>();

	const subscribe = (listener: () => void): Unsubscribe =>
		emitter.subscribe(listener);

	const get = <T = unknown>(path: string): T =>
		findSinglePointer(document, path).value as T;

	const select = <T = unknown>(path: string): Observable<T> => {
		return {
			get: () => get<T>(path),
			subscribe: (listener) => {
				let prev = get<T>(path);
				listener(prev);

				return subscribe(() => {
					const next = get<T>(path);
					if (Object.is(next, prev)) return;
					prev = next;
					listener(next);
				});
			},
		};
	};

	const patch = (operations: JsonPatchOperation[]) => {
		if (operations.length === 0) return;
		try {
			const next = jsonpatch.apply(
				operations as unknown as jsonpatch.OpObject[],
				document as any,
			);
			// Ensure we always have a new reference for React reactivity
			document = Array.isArray(next) ? [...next] : { ...(next as any) };
			emitter.emit(undefined);
		} catch (err) {
			throw new UISpecError(
				'UI_SPEC_PATCH_FAILED',
				`Failed to apply JSON Patch: ${err instanceof Error ? err.message : String(err)}`,
				{ operations, error: err },
			);
		}
	};

	const set = (path: string, value: unknown) => {
		const { pointer } = findSinglePointer(document, path);
		patch(makeSetOps(pointer, document, value));
	};

	const update = (path: string, updater: (current: unknown) => unknown) => {
		const { pointer, value } = findSinglePointer(document, path);
		patch(makeSetOps(pointer, document, updater(value)));
	};

	const merge = (path: string, partial: Record<string, unknown>) => {
		const { pointer, value } = findSinglePointer(document, path);
		patch(makeMergeOps(pointer, value, partial));
	};

	const push = (path: string, ...items: unknown[]) => {
		const { pointer, value } = findSinglePointer(document, path);
		patch(makePushOps(pointer, value, items));
	};

	const remove = (path: string, predicate: (item: unknown) => boolean) => {
		const { pointer, value } = findSinglePointer(document, path);
		const ops = makeRemoveOps(pointer, value, predicate);
		patch(ops);
	};

	const getDocument = () => document;

	if (typeof JSONPointer !== 'function') {
		throw new UISpecError(
			'UI_SPEC_JSONP3_API_MISSING',
			'json-p3 JSONPointer is missing',
		);
	}

	return {
		get,
		select,
		patch,
		set,
		update,
		merge,
		push,
		remove,
		subscribe,
		getDocument,
	};
}
