import { jsonpath, JSONPointer } from 'json-p3';

import { applyOperations } from './patch/apply';
import { buildSetPatch } from './patch/builder';
import { detectPathType } from './path/detect';
import type {
	CallOptions,
	DataMapOptions,
	Operation,
	ResolvedMatch,
} from './types';

function normalizePointerInput(input: string): string {
	if (input === '#') return '';
	if (input.startsWith('#/')) return input.slice(1);
	return input;
}

function cloneSnapshot<T>(value: T): T {
	return structuredClone(value);
}

export class DataMap<T = unknown, Ctx = unknown> {
	private _data: T;
	private readonly _strict: boolean;
	private readonly _context: Ctx | undefined;

	constructor(initialValue: T, options: DataMapOptions<T, Ctx> = {}) {
		this._strict = options.strict ?? false;
		this._context = options.context;
		this._data = cloneSnapshot(initialValue);
	}

	get context(): Ctx | undefined {
		return this._context;
	}

	toJSON(): T {
		return cloneSnapshot(this._data);
	}

	getSnapshot(): T {
		return cloneSnapshot(this._data);
	}

	resolve(pathOrPointer: string, options: CallOptions = {}): ResolvedMatch[] {
		const strict = options.strict ?? this._strict;
		const pathType = detectPathType(pathOrPointer);

		if (pathType === 'relative-pointer') {
			if (strict) throw new Error('Unsupported path type: relative-pointer');
			return [];
		}

		if (pathType === 'pointer') {
			const pointerString = normalizePointerInput(pathOrPointer);
			if (pointerString === '') {
				return [{ pointer: '', value: cloneSnapshot(this._data) }];
			}

			try {
				const pointer = new JSONPointer(pointerString);
				const resolved = pointer.resolve(this._data as any);
				return [{ pointer: pointerString, value: cloneSnapshot(resolved) }];
			} catch {
				if (strict) throw new Error(`Pointer not found: ${pointerString}`);
				return [];
			}
		}

		try {
			const nodes = jsonpath.query(pathOrPointer, this._data as any);
			const pointers = nodes.pointers().map((p) => p.toString());
			const values = nodes.values();
			return pointers.map((pointer, idx) => ({
				pointer,
				value: cloneSnapshot(values[idx]),
			}));
		} catch {
			if (strict) throw new Error(`Invalid JSONPath: ${pathOrPointer}`);
			return [];
		}
	}

	get(pathOrPointer: string, options: CallOptions = {}): unknown {
		return this.resolve(pathOrPointer, options)[0]?.value;
	}

	getAll(pathOrPointer: string, options: CallOptions = {}): unknown[] {
		return this.resolve(pathOrPointer, options).map((m) => m.value);
	}

	/**
	 * Write API (spec §4.6)
	 */
	readonly set = Object.assign(
		(
			pathOrPointer: string,
			value: unknown | ((current: unknown) => unknown),
			options: CallOptions = {},
		) => {
			const strict = options.strict ?? this._strict;
			const matches = this.resolve(pathOrPointer, { strict });
			const targetPointer = matches[0]?.pointer;

			// If pointer or singular JSONPath resolved, use it; otherwise if unresolved and strict, throw.
			if (!targetPointer) {
				const pathType = detectPathType(pathOrPointer);
				if (pathType === 'pointer') {
					const pointerString = normalizePointerInput(pathOrPointer);
					const current = undefined;
					const nextValue =
						typeof value === 'function' ? (value as any)(current) : value;
					const ops = buildSetPatch(this._data, pointerString, nextValue);
					this.patch(ops, { strict });
					return this;
				}
				if (strict) throw new Error('No matches for set()');
				return this;
			}

			const current = matches[0]?.value;
			const nextValue =
				typeof value === 'function' ? (value as any)(current) : value;
			const ops = buildSetPatch(this._data, targetPointer, nextValue);
			this.patch(ops, { strict });
			return this;
		},
		{
			toPatch: (
				pathOrPointer: string,
				value: unknown,
				options: CallOptions = {},
			): Operation[] => {
				const strict = options.strict ?? this._strict;
				const matches = this.resolve(pathOrPointer, { strict });
				const targetPointer = matches[0]?.pointer;
				if (!targetPointer) {
					const pathType = detectPathType(pathOrPointer);
					if (pathType === 'pointer') {
						const pointerString = normalizePointerInput(pathOrPointer);
						return buildSetPatch(this._data, pointerString, value);
					}
					if (strict) throw new Error('No matches for set.toPatch()');
					return [];
				}
				return buildSetPatch(this._data, targetPointer, value);
			},
		},
	);

	readonly setAll = Object.assign(
		(
			pathOrPointer: string,
			value: unknown | ((current: unknown) => unknown),
			options: CallOptions = {},
		) => {
			const ops = this.setAll.toPatch(pathOrPointer, value as any, options);
			if (ops.length === 0) return this;
			this.patch(ops, options);
			return this;
		},
		{
			toPatch: (
				pathOrPointer: string,
				value: unknown | ((current: unknown) => unknown),
				options: CallOptions = {},
			): Operation[] => {
				const strict = options.strict ?? this._strict;
				const matches = this.resolve(pathOrPointer, { strict });
				if (matches.length === 0) {
					const pathType = detectPathType(pathOrPointer);
					if (pathType === 'pointer') {
						const pointerString = normalizePointerInput(pathOrPointer);
						const current = undefined;
						const nextValue =
							typeof value === 'function' ? (value as any)(current) : value;
						return buildSetPatch(this._data, pointerString, nextValue);
					}
					if (strict) throw new Error('No matches for setAll.toPatch()');
					return [];
				}

				const ops: Operation[] = [];
				for (const m of matches) {
					const nextValue =
						typeof value === 'function' ? (value as any)(m.value) : value;
					ops.push(...buildSetPatch(this._data, m.pointer, nextValue));
				}
				return ops;
			},
		},
	);

	readonly map = Object.assign(
		(
			pathOrPointer: string,
			mapperFn: (value: unknown, pointer: string) => unknown,
			options: CallOptions = {},
		) => {
			const ops = this.map.toPatch(pathOrPointer, mapperFn, options);
			if (ops.length === 0) return this;
			this.patch(ops, options);
			return this;
		},
		{
			toPatch: (
				pathOrPointer: string,
				mapperFn: (value: unknown, pointer: string) => unknown,
				options: CallOptions = {},
			): Operation[] => {
				const strict = options.strict ?? this._strict;
				const matches = this.resolve(pathOrPointer, { strict });
				if (matches.length === 0) {
					if (strict) throw new Error('No matches for map.toPatch()');
					return [];
				}
				const ops: Operation[] = [];
				for (const m of matches) {
					ops.push(
						...buildSetPatch(
							this._data,
							m.pointer,
							mapperFn(m.value, m.pointer),
						),
					);
				}
				return ops;
			},
		},
	);

	readonly patch = Object.assign(
		(ops: Operation[], options: CallOptions = {}) => {
			const strict = options.strict ?? this._strict;
			try {
				const { nextData } = applyOperations(this._data, ops);
				this._data = nextData as T;
				return this;
			} catch (e) {
				if (strict) throw e;
				return this;
			}
		},
		{
			toPatch: (ops: Operation[]) => ops,
		},
	);
}
