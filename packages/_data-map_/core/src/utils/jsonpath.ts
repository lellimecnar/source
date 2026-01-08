import type { PathSegment } from '@jsonpath/core';
import { JSONPathError, JSONPathSyntaxError } from '@jsonpath/core';
import {
	query as jpQuery,
	stream as jpStream,
	compileQuery,
} from '@jsonpath/jsonpath';
import { applyPatch } from '@jsonpath/patch';
import { JSONPointer } from '@jsonpath/pointer';

import type { Operation } from '../types';
import { compileAccessor } from './accessor-cache';
import { tryPointerExistsInline, tryResolvePointerInline } from './pointer';

export class DataMapPathError extends Error {
	readonly code: string;
	readonly path?: string;
	override readonly cause?: Error;

	constructor(
		message: string,
		options: {
			code: string;
			path?: string;
			cause?: Error;
		} = { code: 'PATH_ERROR' },
	) {
		super(message);
		this.name = 'DataMapPathError';
		this.code = options.code;
		this.path = options.path;
		this.cause = options.cause;

		Object.setPrototypeOf(this, new.target.prototype);
	}
}

function normalizeError(err: unknown, path?: string): DataMapPathError {
	if (err instanceof DataMapPathError) return err;

	if (err instanceof JSONPathSyntaxError) {
		return new DataMapPathError(`Invalid JSONPath syntax: ${err.message}`, {
			code: err.code,
			path: path ?? err.path,
			cause: err,
		});
	}

	if (err instanceof JSONPathError) {
		return new DataMapPathError(err.message, {
			code: err.code,
			path: path ?? err.path,
			cause: err,
		});
	}

	if (err instanceof Error) {
		return new DataMapPathError(err.message, {
			code: 'PATH_ERROR',
			path,
			cause: err,
		});
	}

	return new DataMapPathError(String(err), { code: 'PATH_ERROR', path });
}

function toPointerTokens(path: readonly PathSegment[]): string[] {
	return path.map((seg) => (typeof seg === 'number' ? String(seg) : seg));
}

export { compileQuery };

export function queryWithPointers(
	data: unknown,
	path: string,
): { pointers: string[]; values: unknown[] } {
	try {
		const result = jpQuery(data as any, path);
		return {
			pointers: result.pointerStrings(),
			values: result.values(),
		};
	} catch (err) {
		throw normalizeError(err, path);
	}
}

export function* streamQuery(
	data: unknown,
	path: string,
): Generator<{ pointer: string; value: unknown; root?: unknown }> {
	try {
		for (const node of jpStream(data as any, path)) {
			yield {
				pointer: new JSONPointer(toPointerTokens(node.path)).toPointer(),
				value: node.value,
				root: node.root,
			};
		}
	} catch (err) {
		throw normalizeError(err, path);
	}
}

export function resolvePointer<T = unknown>(
	data: unknown,
	pointer: string,
): T | undefined {
	try {
		// Ultra-fast path: accessor compilation for simple pointers without escapes.
		// Runs before the inline fast-path to cover more cases without JSONPointer overhead.
		if (pointer !== '' && pointer.startsWith('/') && !pointer.includes('~')) {
			const get = compileAccessor(pointer);
			return get(data) as T | undefined;
		}
		const fast = tryResolvePointerInline<T>(data, pointer);
		if (fast.ok) return fast.value;
		return new JSONPointer(pointer).resolve<T>(data);
	} catch (err) {
		throw normalizeError(err, pointer);
	}
}

export function pointerExists(data: unknown, pointer: string): boolean {
	try {
		const fast = tryPointerExistsInline(data, pointer);
		if (fast.ok) return fast.exists;
		return new JSONPointer(pointer).exists(data);
	} catch (err) {
		throw normalizeError(err, pointer);
	}
}

export function applyOperations<T>(
	target: T,
	ops: Operation[],
	options: { mutate?: boolean } = {},
): T {
	try {
		return applyPatch(target as any, ops as any, {
			mutate: options.mutate ?? false,
		}) as T;
	} catch (err) {
		throw normalizeError(err);
	}
}
