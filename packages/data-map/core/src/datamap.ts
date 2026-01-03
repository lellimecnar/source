import { jsonpath, JSONPointer } from 'json-p3';

import { BatchManager } from './batch/manager';
import type { BatchContext } from './batch/types';
import { DefinitionRegistry } from './definitions/registry';
import { applyOperations } from './patch/apply';
import {
	buildPopPatch,
	buildPushPatch,
	buildShiftPatch,
	buildShufflePatch,
	buildSortPatch,
	buildSplicePatch,
	buildUnshiftPatch,
} from './patch/array';
import { buildSetPatch } from './patch/builder';
import { detectPathType } from './path/detect';
import { SubscriptionManagerImpl } from './subscription/manager';
import type { Subscription, SubscriptionConfig } from './subscription/types';
import type {
	CallOptions,
	DataMapOptions,
	Operation,
	ResolvedMatch,
} from './types';
import { deepEqual, deepExtends } from './utils/equal';

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
	private readonly _subs = new SubscriptionManagerImpl<T, Ctx>(this);
	private readonly _batch = new BatchManager();
	private readonly _defs = new DefinitionRegistry<T, Ctx>(this);
	private readonly _defineOptions: DataMapOptions<T, Ctx>['define'] | undefined;

	constructor(initialValue: T, options: DataMapOptions<T, Ctx> = {}) {
		this._strict = options.strict ?? false;
		this._context = options.context;
		this._data = cloneSnapshot(initialValue);
		this._defineOptions = options.define;

		if (options.define && options.context !== undefined) {
			this._defs.registerAll(options.define, options.context);
		}
		if (options.subscribe) {
			for (const s of options.subscribe) this.subscribe(s);
		}
	}

	get context(): Ctx | undefined {
		return this._context;
	}

	subscribe(config: SubscriptionConfig<T, Ctx>): Subscription {
		return this._subs.register(config);
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
		const ctx = this._context as any;

		if (pathType === 'relative-pointer') {
			if (strict) throw new Error('Unsupported path type: relative-pointer');
			return [];
		}

		if (pathType === 'pointer') {
			const pointerString = normalizePointerInput(pathOrPointer);
			if (pointerString === '') {
				return [
					{
						pointer: '',
						value: cloneSnapshot(this._defs.applyGetter('', this._data, ctx)),
					},
				];
			}

			try {
				const pointer = new JSONPointer(pointerString);
				const resolved = pointer.resolve(this._data as any);
				return [
					{
						pointer: pointerString,
						value: cloneSnapshot(
							this._defs.applyGetter(pointerString, resolved, ctx),
						),
					},
				];
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
				value: cloneSnapshot(this._defs.applyGetter(pointer, values[idx], ctx)),
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
			const ctx = this._context as any;

			// If pointer or singular JSONPath resolved, use it; otherwise if unresolved and strict, throw.
			if (!targetPointer) {
				const pathType = detectPathType(pathOrPointer);
				if (pathType === 'pointer') {
					const pointerString = normalizePointerInput(pathOrPointer);
					const current = undefined;
					let nextValue =
						typeof value === 'function' ? (value as any)(current) : value;

					nextValue = this._defs.applySetter(
						pointerString,
						nextValue,
						current,
						ctx,
					);

					const ops = buildSetPatch(this._data, pointerString, nextValue);
					this.patch(ops, { strict });
					return this;
				}
				if (strict) throw new Error('No matches for set()');
				return this;
			}

			const current = matches[0]?.value;
			let nextValue =
				typeof value === 'function' ? (value as any)(current) : value;

			nextValue = this._defs.applySetter(
				targetPointer,
				nextValue,
				current,
				ctx,
			);

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
			const strict = options.strict ?? this._strict;
			const ops = this.setAll.toPatch(pathOrPointer, value as any, options);
			if (ops.length === 0) {
				if (strict) throw new Error('No matches for setAll()');
				return this;
			}
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
				const ctx = this._context as any;

				const ops: Operation[] = [];
				for (const m of matches) {
					let nextValue =
						typeof value === 'function' ? (value as any)(m.value) : value;

					nextValue = this._defs.applySetter(
						m.pointer,
						nextValue,
						m.value,
						ctx,
					);

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
			const strict = options.strict ?? this._strict;
			const ops = this.map.toPatch(pathOrPointer, mapperFn, options);
			if (ops.length === 0) {
				if (strict) throw new Error('No matches for map()');
				return this;
			}
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
				const ctx = this._context as any;

				const ops: Operation[] = [];
				for (const m of matches) {
					let nextValue = mapperFn(m.value, m.pointer);
					nextValue = this._defs.applySetter(
						m.pointer,
						nextValue,
						m.value,
						ctx,
					);

					ops.push(...buildSetPatch(this._data, m.pointer, nextValue));
				}
				return ops;
			},
		},
	);

	readonly patch = Object.assign(
		(ops: Operation[], options: CallOptions = {}) => {
			const strict = options.strict ?? this._strict;
			try {
				for (const op of ops) {
					const before = this._subs.notify(
						op.path,
						'patch',
						'before',
						this.get(op.path),
						undefined,
						op,
						op.path,
					);
					if (before.cancelled)
						throw new Error('Patch cancelled by subscription');
				}

				const { nextData, affectedPointers, structuralPointers } =
					applyOperations(this._data, ops);
				this._data = nextData as T;

				if (this._batch.isBatching) {
					this._batch.collect(ops, affectedPointers, structuralPointers);
					return this;
				}

				for (const p of structuralPointers) {
					this._subs.handleStructuralChange(p);
				}

				for (const op of ops) {
					this._subs.notify(
						op.path,
						'patch',
						'on',
						this.get(op.path),
						undefined,
						op,
						op.path,
					);
					this._subs.notify(
						op.path,
						'patch',
						'after',
						this.get(op.path),
						undefined,
						op,
						op.path,
					);
				}

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

	readonly push = Object.assign(
		(pathOrPointer: string, ...items: unknown[]) => {
			const ops = this.push.toPatch(pathOrPointer, ...items);
			this.patch(ops);
			return this;
		},
		{
			toPatch: (pathOrPointer: string, ...items: unknown[]): Operation[] => {
				const pointer =
					this.resolve(pathOrPointer)[0]?.pointer ??
					normalizePointerInput(pathOrPointer);
				return buildPushPatch(this._data, pointer, items);
			},
		},
	);

	pop(pathOrPointer: string): unknown {
		const pointer =
			this.resolve(pathOrPointer)[0]?.pointer ??
			normalizePointerInput(pathOrPointer);
		const { ops, value } = buildPopPatch(this._data, pointer);
		this.patch(ops);
		return value;
	}

	shift(pathOrPointer: string): unknown {
		const pointer =
			this.resolve(pathOrPointer)[0]?.pointer ??
			normalizePointerInput(pathOrPointer);
		const { ops, value } = buildShiftPatch(this._data, pointer);
		this.patch(ops);
		return value;
	}

	readonly unshift = Object.assign(
		(pathOrPointer: string, ...items: unknown[]) => {
			const ops = this.unshift.toPatch(pathOrPointer, ...items);
			this.patch(ops);
			return this;
		},
		{
			toPatch: (pathOrPointer: string, ...items: unknown[]): Operation[] => {
				const pointer =
					this.resolve(pathOrPointer)[0]?.pointer ??
					normalizePointerInput(pathOrPointer);
				return buildUnshiftPatch(this._data, pointer, items);
			},
		},
	);

	splice(
		pathOrPointer: string,
		start: number,
		deleteCount = 0,
		...items: unknown[]
	): unknown[] {
		const pointer =
			this.resolve(pathOrPointer)[0]?.pointer ??
			normalizePointerInput(pathOrPointer);
		const { ops, removed } = buildSplicePatch(
			this._data,
			pointer,
			start,
			deleteCount,
			items,
		);
		this.patch(ops);
		return removed;
	}

	readonly sort = Object.assign(
		(pathOrPointer: string, compareFn?: (a: unknown, b: unknown) => number) => {
			const ops = this.sort.toPatch(pathOrPointer, compareFn);
			this.patch(ops);
			return this;
		},
		{
			toPatch: (
				pathOrPointer: string,
				compareFn?: (a: unknown, b: unknown) => number,
			): Operation[] => {
				const pointer =
					this.resolve(pathOrPointer)[0]?.pointer ??
					normalizePointerInput(pathOrPointer);
				return buildSortPatch(this._data, pointer, compareFn as any);
			},
		},
	);

	readonly shuffle = Object.assign(
		(pathOrPointer: string) => {
			const ops = this.shuffle.toPatch(pathOrPointer);
			this.patch(ops);
			return this;
		},
		{
			toPatch: (pathOrPointer: string): Operation[] => {
				const pointer =
					this.resolve(pathOrPointer)[0]?.pointer ??
					normalizePointerInput(pathOrPointer);
				return buildShufflePatch(this._data, pointer);
			},
		},
	);

	batch<R>(fn: (dm: this) => R): R {
		this._batch.start();
		try {
			const result = fn(this);
			const context = this._batch.end();

			if (this._batch.depth === 0 && context) {
				this._flushBatch(context);
			}

			return result;
		} catch (e) {
			this._batch.end();
			throw e;
		}
	}

	transaction<R>(fn: (dm: this) => R): R {
		const snapshot = this.getSnapshot();
		try {
			return this.batch(fn);
		} catch (e) {
			this._data = snapshot;
			throw e;
		}
	}

	private _flushBatch(context: BatchContext): void {
		for (const p of context.structuralPointers) {
			this._subs.handleStructuralChange(p);
		}

		for (const p of context.affectedPointers) {
			const val = this.get(p);
			this._subs.notify(p, 'patch', 'on', val, undefined, undefined, p);
			this._subs.notify(p, 'patch', 'after', val, undefined, undefined, p);
		}
	}

	equals(other: DataMap<T, Ctx> | T): boolean {
		const otherValue =
			other instanceof (this.constructor as any)
				? (other as any).toJSON()
				: other;
		return deepEqual(this.toJSON(), otherValue);
	}

	extends(other: Partial<T>): boolean {
		return deepExtends(this.toJSON(), other);
	}

	clone(options?: Partial<DataMapOptions<T, Ctx>>): DataMap<T, Ctx> {
		return new (this.constructor as any)(this.getSnapshot(), {
			strict: this._strict,
			context: this._context,
			define: this._defineOptions,
			...options,
		});
	}
}
