import { FluentBatchBuilder } from './batch/builder';
import type { Batch } from './batch/fluent';
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
import { compilePathPattern } from './path/compile';
import { detectPathType } from './path/detect';
import { SubscriptionManagerImpl } from './subscription/manager';
import type {
	Subscription,
	SubscriptionConfig,
	SubscriptionEvent,
} from './subscription/types';
import type {
	CallOptions,
	DataMapOptions,
	Operation,
	ResolvedMatch,
} from './types';
import { cloneSnapshot } from './utils/clone';
import { deepEqual, deepExtends } from './utils/equal';
import {
	pointerExists,
	queryWithPointers,
	resolvePointer,
	streamQuery,
} from './utils/jsonpath';

function normalizePointerInput(input: string): string {
	if (input === '#') return '';
	if (input.startsWith('#/')) return input.slice(1);
	return input;
}

export class DataMap<T = unknown, Ctx = unknown> {
	private _data: T;
	private readonly _strict: boolean;
	private readonly _context: Ctx | undefined;
	private _subs: SubscriptionManagerImpl<T, Ctx> | null = null;
	private readonly _batch = new BatchManager();
	private readonly _defs = new DefinitionRegistry<T, Ctx>(this);
	private readonly _defineOptions: DataMapOptions<T, Ctx>['define'] | undefined;
	private readonly _previousValues = new Map<string, unknown>();
	private readonly _lastUpdated = new Map<string, number>();

	private get subs(): SubscriptionManagerImpl<T, Ctx> {
		if (!this._subs) this._subs = new SubscriptionManagerImpl<T, Ctx>(this);
		return this._subs;
	}

	private hasSubscribers(): boolean {
		return this._subs !== null && this._subs.hasSubscribers();
	}

	private scheduleNotify(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): void {
		// Only schedule if we have subscriptions; otherwise skip the overhead
		if (this._subs) {
			this._subs.scheduleNotify(
				pointer,
				event,
				stage,
				value,
				previousValue,
				operation,
				originalPath,
			);
		}
	}

	private notify(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): { cancelled: boolean; transformedValue?: unknown; handlerCount: number } {
		// Only notify if we have subscriptions; otherwise skip the overhead
		if (this._subs) {
			return this._subs.notify(
				pointer,
				event,
				stage,
				value,
				previousValue,
				operation,
				originalPath,
			);
		}
		return { cancelled: false, handlerCount: 0 };
	}

	constructor(initialValue: T, options: DataMapOptions<T, Ctx> = {}) {
		this._strict = options.strict ?? false;
		this._context = options.context;
		this._data = cloneSnapshot(initialValue);
		this._defineOptions = options.define;

		if (options.define && options.context !== undefined) {
			this._defs.registerAll(options.define, options.context);
			this._applyDefinitionDefaults();
		}
		if (options.subscribe) {
			for (const s of options.subscribe) this.subscribe(s);
		}
	}

	get context(): Ctx | undefined {
		return this._context;
	}

	subscribe(config: SubscriptionConfig<T, Ctx>): Subscription {
		return this.subs.register(config);
	}

	private buildResolvedMatch(pointer: string, value: unknown): ResolvedMatch {
		const defs = this._defs.findForPointer(pointer);

		// Extract metadata from first matching definition
		let readOnly: boolean | undefined;
		let type: string | undefined;
		if (defs.length > 0) {
			const def = defs[0];
			if (def && 'readOnly' in def) {
				readOnly = (def as any).readOnly;
			}
			if (def && 'type' in def) {
				type = (def as any).type;
			}
		}

		// Extract write tracking metadata
		const previousValue = this._previousValues.get(pointer);
		const lastUpdated = this._lastUpdated.get(pointer);

		const match: ResolvedMatch = {
			pointer,
			value,
		};

		if (readOnly !== undefined) (match as any).readOnly = readOnly;
		if (type !== undefined) (match as any).type = type;
		if (previousValue !== undefined)
			(match as any).previousValue = previousValue;
		if (lastUpdated !== undefined) (match as any).lastUpdated = lastUpdated;

		return match;
	}

	toJSON(): T {
		return cloneSnapshot(this._data);
	}

	getSnapshot(): T {
		return cloneSnapshot(this._data);
	}

	resolve(pathOrPointer: string, options: CallOptions = {}): ResolvedMatch[] {
		const strict = options.strict ?? this._strict;
		const shouldClone = options.clone ?? true;
		const pathType = detectPathType(pathOrPointer);
		const ctx = this._context as any;

		if (pathType === 'relative-pointer') {
			if (strict) throw new Error('Unsupported path type: relative-pointer');
			return [];
		}

		if (pathType === 'pointer') {
			const pointerString = normalizePointerInput(pathOrPointer);
			if (pointerString === '') {
				const raw = this._defs.applyGetter('', this._data, ctx);
				const value = shouldClone ? cloneSnapshot(raw) : raw;
				this.scheduleNotify(
					'',
					'resolve',
					'on',
					value,
					undefined,
					undefined,
					pathOrPointer,
				);
				this.scheduleNotify(
					'',
					'resolve',
					'after',
					value,
					undefined,
					undefined,
					pathOrPointer,
				);
				return [this.buildResolvedMatch('', value)];
			}

			const resolved = resolvePointer(this._data, pointerString);
			if (resolved === undefined && !pointerExists(this._data, pointerString)) {
				if (strict) throw new Error(`Pointer not found: ${pointerString}`);
				return [];
			}

			const raw = this._defs.applyGetter(pointerString, resolved, ctx);
			const value = shouldClone ? cloneSnapshot(raw) : raw;

			this.scheduleNotify(
				pointerString,
				'resolve',
				'on',
				value,
				undefined,
				undefined,
				pathOrPointer,
			);
			this.scheduleNotify(
				pointerString,
				'resolve',
				'after',
				value,
				undefined,
				undefined,
				pathOrPointer,
			);

			return [this.buildResolvedMatch(pointerString, value)];
		}

		try {
			const { pointers, values } = queryWithPointers(this._data, pathOrPointer);
			const matches = pointers.map((pointer, idx) => {
				const raw = this._defs.applyGetter(pointer, values[idx], ctx);
				const value = shouldClone ? cloneSnapshot(raw) : raw;
				return this.buildResolvedMatch(pointer, value);
			});

			for (const m of matches) {
				this.scheduleNotify(
					m.pointer,
					'resolve',
					'on',
					m.value,
					undefined,
					undefined,
					pathOrPointer,
				);
				this.scheduleNotify(
					m.pointer,
					'resolve',
					'after',
					m.value,
					undefined,
					undefined,
					pathOrPointer,
				);
			}

			return matches;
		} catch (err) {
			if (strict) {
				if (err instanceof Error) throw err;
				throw new Error(`Invalid JSONPath: ${pathOrPointer}`, { cause: err });
			}
			return [];
		}
	}

	*resolveStream(
		pathOrPointer: string,
		options: CallOptions = {},
	): Generator<ResolvedMatch> {
		const strict = options.strict ?? this._strict;
		const shouldClone = options.clone ?? true;
		const pathType = detectPathType(pathOrPointer);
		const ctx = this._context as any;

		if (pathType !== 'jsonpath') {
			const matches = this.resolve(pathOrPointer, options);
			for (const match of matches) yield match;
			return;
		}

		try {
			for (const node of streamQuery(this._data, pathOrPointer)) {
				const pointer = node.pointer;
				const raw = this._defs.applyGetter(pointer, node.value, ctx);
				const value = shouldClone ? cloneSnapshot(raw) : raw;

				this.scheduleNotify(
					pointer,
					'resolve',
					'on',
					value,
					undefined,
					undefined,
					pathOrPointer,
				);
				this.scheduleNotify(
					pointer,
					'resolve',
					'after',
					value,
					undefined,
					undefined,
					pathOrPointer,
				);

				yield { pointer, value };
			}
		} catch (err) {
			if (strict) {
				if (err instanceof Error) throw err;
				throw new Error(`Invalid JSONPath: ${pathOrPointer}`, { cause: err });
			}
		}
	}

	get(pathOrPointer: string, options: CallOptions = {}): unknown {
		const matches = this.resolve(pathOrPointer, options);
		const match = matches[0];
		if (!match) return undefined;

		const before = this.notify(
			match.pointer,
			'get',
			'before',
			match.value,
			undefined,
			undefined,
			pathOrPointer,
		);

		this.scheduleNotify(
			match.pointer,
			'get',
			'on',
			match.value,
			undefined,
			undefined,
			pathOrPointer,
		);
		this.scheduleNotify(
			match.pointer,
			'get',
			'after',
			match.value,
			undefined,
			undefined,
			pathOrPointer,
		);

		return before.transformedValue !== undefined
			? before.transformedValue
			: match.value;
	}

	getAll(pathOrPointer: string, options: CallOptions = {}): unknown[] {
		return this.resolve(pathOrPointer, options).map((m) => m.value);
	}

	/**
	 * Internal get without triggering notifications
	 */
	peek(pointer: string): unknown {
		try {
			return resolvePointer(this._data, normalizePointerInput(pointer));
		} catch {
			return undefined;
		}
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

			// Never mutate caller-provided operations; we may rewrite `value` when before-hooks transform.
			const effectiveOps: Operation[] = ops.map((op) => ({ ...op })) as any;

			try {
				// Capture previous values before applying operations
				const previousValues = new Map<string, unknown>();
				for (const op of effectiveOps) {
					const previousValue = this.get(op.path);
					previousValues.set(op.path, previousValue);
					if (op.op === 'move') {
						previousValues.set(op.from, undefined);
					}
				}

				for (const op of effectiveOps) {
					const previousValue = previousValues.get(op.path);
					const nextValue = 'value' in op ? op.value : undefined;

					const before = this.notify(
						op.path,
						'patch',
						'before',
						nextValue,
						previousValue,
						op,
						op.path,
					);

					if (before.cancelled) {
						throw new Error('Patch cancelled by subscription');
					}

					if (before.transformedValue !== undefined && 'value' in op) {
						op.value = before.transformedValue;
					}
				}

				const { nextData, affectedPointers, structuralPointers } =
					applyOperations(this._data, effectiveOps);
				this._data = nextData as T;

				// Track metadata for all affected pointers
				const now = Date.now();
				for (const op of effectiveOps) {
					const pointer = op.path;
					const prevValue = previousValues.get(pointer);
					this._previousValues.set(pointer, prevValue);
					this._lastUpdated.set(pointer, now);

					// For move operations, also track the from pointer
					if (op.op === 'move') {
						const fromPointer = op.from;
						this._previousValues.set(fromPointer, undefined);
						this._lastUpdated.set(fromPointer, now);
					}
				}

				if (this._batch.isBatching) {
					this._batch.collect(
						effectiveOps,
						affectedPointers,
						structuralPointers,
					);
					return this;
				}

				for (const p of structuralPointers) {
					this._subs?.handleStructuralChange(p);
				}

				for (const p of affectedPointers) {
					this._subs?.handleFilterCriteriaChange(p);
				}

				// Dispatch notifications, expanding move operations for subscription semantics
				for (const op of effectiveOps) {
					if (op.op === 'move') {
						// Treat move as remove(from) + set(to) for subscription dispatch
						this.notify(
							op.from,
							'remove',
							'on',
							undefined,
							undefined,
							op,
							op.from,
						);
						this.notify(
							op.from,
							'remove',
							'after',
							undefined,
							undefined,
							op,
							op.from,
						);

						this.notify(
							op.path,
							'set',
							'on',
							this.get(op.path),
							undefined,
							op,
							op.path,
						);
						this.notify(
							op.path,
							'set',
							'after',
							this.get(op.path),
							undefined,
							op,
							op.path,
						);
					} else {
						this.notify(
							op.path,
							'patch',
							'on',
							this.get(op.path),
							undefined,
							op,
							op.path,
						);
						this.notify(
							op.path,
							'patch',
							'after',
							this.get(op.path),
							undefined,
							op,
							op.path,
						);
					}
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

	readonly pop = Object.assign(
		(pathOrPointer: string) => {
			const pointer =
				this.resolve(pathOrPointer)[0]?.pointer ??
				normalizePointerInput(pathOrPointer);
			const { ops, value } = buildPopPatch(this._data, pointer);
			this.patch(ops);
			return value;
		},
		{
			toPatch: (pathOrPointer: string): Operation[] => {
				const pointer =
					this.resolve(pathOrPointer)[0]?.pointer ??
					normalizePointerInput(pathOrPointer);
				return buildPopPatch(this._data, pointer).ops;
			},
		},
	);

	readonly shift = Object.assign(
		(pathOrPointer: string) => {
			const pointer =
				this.resolve(pathOrPointer)[0]?.pointer ??
				normalizePointerInput(pathOrPointer);
			const { ops, value } = buildShiftPatch(this._data, pointer);
			this.patch(ops);
			return value;
		},
		{
			toPatch: (pathOrPointer: string): Operation[] => {
				const pointer =
					this.resolve(pathOrPointer)[0]?.pointer ??
					normalizePointerInput(pathOrPointer);
				return buildShiftPatch(this._data, pointer).ops;
			},
		},
	);

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

	readonly splice = Object.assign(
		(
			pathOrPointer: string,
			start: number,
			deleteCount = 0,
			...items: unknown[]
		) => {
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
		},
		{
			toPatch: (
				pathOrPointer: string,
				start: number,
				deleteCount = 0,
				...items: unknown[]
			): Operation[] => {
				const pointer =
					this.resolve(pathOrPointer)[0]?.pointer ??
					normalizePointerInput(pathOrPointer);
				return buildSplicePatch(this._data, pointer, start, deleteCount, items)
					.ops;
			},
		},
	);

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

	batch: any = Object.assign(
		<R>(fn: (dm: this) => R): R => {
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
		},
		{
			set: (pathOrPointer: string, value: unknown, options?: CallOptions) => {
				const builder = new FluentBatchBuilder(this);
				return builder.set(pathOrPointer, value, options);
			},
			remove: (pathOrPointer: string, options?: CallOptions) => {
				const builder = new FluentBatchBuilder(this);
				return builder.remove(pathOrPointer, options);
			},
			merge: (pathOrPointer: string, value: object, options?: CallOptions) => {
				const builder = new FluentBatchBuilder(this);
				return builder.merge(pathOrPointer, value, options);
			},
			move: (from: string, to: string, options?: CallOptions) => {
				const builder = new FluentBatchBuilder(this);
				return builder.move(from, to, options);
			},
			copy: (from: string, to: string, options?: CallOptions) => {
				const builder = new FluentBatchBuilder(this);
				return builder.copy(from, to, options);
			},
		} as any,
	);

	transaction<R>(fn: (dm: this) => R): R {
		const snapshot = this.getSnapshot();
		try {
			return this.batch(fn);
		} catch (e) {
			this._data = snapshot;
			throw e;
		}
	}

	private _applyDefinitionDefaults(): void {
		const defs = this._defs.getRegisteredDefinitions();

		let working = this._data as unknown;
		const allOps: Operation[] = [];

		const exists = (data: unknown, pointer: string): boolean => {
			if (pointer === '') return true;
			try {
				return pointerExists(data, pointer);
			} catch {
				return false;
			}
		};

		const apply = (ops: Operation[]) => {
			if (ops.length === 0) return;
			const { nextData } = applyOperations(working, ops);
			working = nextData;
			allOps.push(...ops);
		};

		for (const def of defs) {
			if (def.defaultValue === undefined) continue;

			if ('pointer' in def && typeof def.pointer === 'string') {
				const pointer = normalizePointerInput(def.pointer);
				if (!exists(working, pointer)) {
					apply(buildSetPatch(working, pointer, def.defaultValue));
				}
				continue;
			}

			if ('path' in def && typeof def.path === 'string') {
				const pattern = compilePathPattern(def.path);

				if (pattern.isSingular) {
					const pointer = pattern.concretePrefixPointer;
					if (!exists(working, pointer)) {
						apply(buildSetPatch(working, pointer, def.defaultValue));
					}
					continue;
				}

				const pointers = pattern.expand(working);
				for (const p of pointers) {
					if (!exists(working, p)) {
						apply(buildSetPatch(working, p, def.defaultValue));
					}
				}
			}
		}

		if (allOps.length === 0) return;
		this._data = working as T;
	}

	private _flushBatch(context: BatchContext): void {
		for (const p of context.structuralPointers) {
			this._subs?.handleStructuralChange(p);
		}

		for (const p of context.affectedPointers) {
			this._subs?.handleFilterCriteriaChange(p);
		}

		for (const p of context.affectedPointers) {
			const val = this.get(p);
			this.notify(p, 'patch', 'on', val, undefined, undefined, p);
			this.notify(p, 'patch', 'after', val, undefined, undefined, p);
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
