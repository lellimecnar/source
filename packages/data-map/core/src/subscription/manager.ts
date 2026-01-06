import type { DataMap } from '../datamap';
import type { Operation } from '../types';
import { BloomFilter } from './bloom';
import { generateSubscriptionId } from './id';
import { NotificationScheduler } from './scheduler';
import type {
	Subscription,
	SubscriptionConfig,
	SubscriptionEvent,
	SubscriptionEventInfo,
} from './types';
import type { CompiledPathPattern } from '../path/compile';
import { compilePathPattern } from '../path/compile';
import { detectPathType } from '../path/detect';
import { compileQuery } from '../utils/jsonpath';

type CompiledQuery = ReturnType<typeof compileQuery>;

interface InternalSubscription<T, Ctx> {
	id: string;
	config: SubscriptionConfig<T, Ctx>;
	compiledPattern: CompiledPathPattern | null;
	expandedPaths: Set<string>;
	isDynamic: boolean;
	compiledQuery?: CompiledQuery;
	registrationOrder: number;
}

export interface NotificationResult {
	cancelled: boolean;
	transformedValue?: unknown;
	handlerCount: number;
}

function asArray<T>(v: T | T[] | undefined): T[] {
	if (!v) return [];
	return Array.isArray(v) ? v : [v];
}

function shouldInvoke(
	config: SubscriptionConfig<any, any>,
	stage: 'before' | 'on' | 'after',
	event: SubscriptionEvent,
): boolean {
	const list =
		stage === 'before'
			? asArray(config.before)
			: stage === 'on'
				? asArray(config.on)
				: asArray(config.after);

	if (list.includes(event)) return true;
	// 'set' subscriptions should also catch 'patch' events by default
	if (event === 'patch' && list.includes('set')) return true;

	return false;
}

function calculateSpecificity(path: string): number {
	// Static pointer: /a/b -> 1000
	// Wildcard:       $.a.* -> 500
	// Recursive:      $..a  -> 100
	if (path.startsWith('$')) {
		if (path.includes('..')) {
			return 100; // Recursive
		}
		if (path.includes('[*]') || path.includes('.*')) {
			return 500; // Wildcard
		}
		return 1000; // Singular JSONPath (acts like pointer)
	}
	return 1000; // Static pointer
}

export class SubscriptionManagerImpl<T, Ctx> {
	private readonly reverseIndex = new Map<string, Set<string>>();
	private readonly subscriptions = new Map<
		string,
		InternalSubscription<T, Ctx>
	>();
	private readonly dynamicSubscriptions = new Map<
		string,
		InternalSubscription<T, Ctx>
	>();
	private readonly structuralWatchers = new Map<string, Set<string>>();
	private readonly filterWatchers = new Map<string, Set<string>>();
	private readonly bloomFilter = new BloomFilter(10000, 7);
	private readonly scheduler = new NotificationScheduler();
	private readonly dataMap: DataMap<T, Ctx>;
	private registrationCounter = 0;

	constructor(dataMap: DataMap<T, Ctx>) {
		this.dataMap = dataMap;
	}

	register(config: SubscriptionConfig<T, Ctx>): Subscription {
		const id = generateSubscriptionId();
		const pathType = detectPathType(config.path);

		let compiledPattern: CompiledPathPattern | null = null;
		let expandedPaths: Set<string>;
		let isDynamic = false;
		let compiledQuery: CompiledQuery | undefined;

		if (pathType === 'pointer') {
			expandedPaths = new Set([config.path]);
			this.addToReverseIndex(config.path, id);
			this.bloomFilter.add(config.path);
		} else {
			compiledPattern = compilePathPattern(config.path);
			isDynamic = !compiledPattern.isSingular;
			const data = this.dataMap.toJSON();

			// Try to compile JSONPath query for precompilation optimization
			// Only precompile queries without filters since compiled queries need proper context
			if (
				pathType === 'jsonpath' &&
				!config.noPrecompile &&
				!compiledPattern.hasFilters
			) {
				try {
					compiledQuery = compileQuery(config.path);
				} catch {
					// If compilation fails, fall back to pattern expansion
					compiledQuery = undefined;
				}
			}

			const pointers = compiledQuery
				? compiledQuery(data).pointerStrings()
				: compiledPattern.expand(data);
			expandedPaths = new Set(pointers);
			for (const p of pointers) {
				this.addToReverseIndex(p, id);
				this.bloomFilter.add(p);
			}
			if (isDynamic) {
				for (const dep of compiledPattern.structuralDependencies) {
					this.addStructuralWatcher(dep, id);
				}
				if (compiledPattern.hasFilters) {
					const prefix = compiledPattern.concretePrefixPointer;
					let set = this.filterWatchers.get(prefix);
					if (!set) {
						set = new Set();
						this.filterWatchers.set(prefix, set);
					}
					set.add(id);
				}
			}
		}

		const internal: InternalSubscription<T, Ctx> = {
			id,
			config,
			compiledPattern,
			expandedPaths,
			isDynamic,
			compiledQuery,
			registrationOrder: this.registrationCounter++,
		};

		this.subscriptions.set(id, internal);
		if (isDynamic) this.dynamicSubscriptions.set(id, internal);

		return this.createPublicSubscription(internal);
	}

	unregister(subscriptionId: string): void {
		const sub = this.subscriptions.get(subscriptionId);
		if (!sub) return;
		for (const p of sub.expandedPaths)
			this.removeFromReverseIndex(p, subscriptionId);
		this.subscriptions.delete(subscriptionId);
		this.dynamicSubscriptions.delete(subscriptionId);

		for (const [dep, set] of this.structuralWatchers) {
			set.delete(subscriptionId);
			if (set.size === 0) this.structuralWatchers.delete(dep);
		}
	}

	scheduleNotify(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): void {
		this.scheduler.schedule(() => {
			this.notify(
				pointer,
				event,
				stage,
				value,
				previousValue,
				operation,
				originalPath,
			);
		});
	}

	notify(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): NotificationResult {
		if (stage === 'on') {
			this.handleFilterCriteriaChange(pointer);
		}

		const execute = () => {
			if (!this.bloomFilter.mightContain(pointer)) {
				return this.notifyDynamic(
					pointer,
					event,
					stage,
					value,
					previousValue,
					operation,
					originalPath,
				);
			}

			const staticIds = this.reverseIndex.get(pointer) ?? new Set<string>();
			const dynamicIds = this.findDynamicMatches(pointer);
			const all = new Set<string>([...staticIds, ...dynamicIds]);

			return this.invokeHandlers(
				all,
				pointer,
				event,
				stage,
				value,
				previousValue,
				operation,
				originalPath,
			);
		};

		if (stage !== 'before') {
			this.scheduler.schedule(execute);
			return { cancelled: false, handlerCount: 0 };
		}

		return execute();
	}

	handleStructuralChange(pointer: string): void {
		const watcherIds = this.structuralWatchers.get(pointer);
		if (!watcherIds || watcherIds.size === 0) {
			return;
		}

		const data = this.dataMap.toJSON();
		for (const id of watcherIds) {
			const sub = this.subscriptions.get(id);
			if (!sub?.compiledPattern) continue;

			const newPointers = sub.compiledQuery
				? sub.compiledQuery(data).pointerStrings()
				: sub.compiledPattern.expand(data);
			const newExpanded = new Set(newPointers);

			const added: string[] = [];
			const removed: string[] = [];
			for (const p of newExpanded) if (!sub.expandedPaths.has(p)) added.push(p);
			for (const p of sub.expandedPaths)
				if (!newExpanded.has(p)) removed.push(p);

			for (const p of removed) this.removeFromReverseIndex(p, id);
			for (const p of added) {
				this.addToReverseIndex(p, id);
				this.bloomFilter.add(p);
				// notify new match
				const v = this.dataMap.get(p);
				this.scheduler.schedule(() => {
					this.invokeHandlers(
						new Set([id]),
						p,
						'set',
						'after',
						v,
						undefined,
						{ op: 'add', path: p, value: v } as any,
						sub.config.path,
					);
				});
			}

			sub.expandedPaths = newExpanded;
		}
	}

	handleFilterCriteriaChange(changedPointer: string): void {
		const data = this.dataMap.toJSON();
		for (const [prefix, ids] of this.filterWatchers) {
			if (prefix !== '') {
				const relevant =
					changedPointer === prefix || changedPointer.startsWith(`${prefix}/`);
				if (!relevant) continue;
			}

			for (const id of ids) {
				const sub = this.subscriptions.get(id);
				if (!sub?.compiledPattern) continue;

				const newPointers = sub.compiledQuery
					? sub.compiledQuery(data).pointerStrings()
					: sub.compiledPattern.expand(data);
				const newExpanded = new Set(newPointers);

				const added: string[] = [];
				const removed: string[] = [];
				for (const p of newExpanded)
					if (!sub.expandedPaths.has(p)) added.push(p);
				for (const p of sub.expandedPaths)
					if (!newExpanded.has(p)) removed.push(p);

				for (const p of removed) this.removeFromReverseIndex(p, id);
				for (const p of added) {
					this.addToReverseIndex(p, id);
					this.bloomFilter.add(p);
				}

				sub.expandedPaths = newExpanded;
			}
		}
	}

	getMatchingSubscriptions(pointer: string): Subscription[] {
		const ids = new Set<string>([
			...(this.reverseIndex.get(pointer) ?? []),
			...this.findDynamicMatches(pointer),
		]);
		return [...ids].map((id) =>
			this.createPublicSubscription(this.subscriptions.get(id)!),
		);
	}

	private notifyDynamic(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): NotificationResult {
		const ids = this.findDynamicMatches(pointer);
		return this.invokeHandlers(
			ids,
			pointer,
			event,
			stage,
			value,
			previousValue,
			operation,
			originalPath,
		);
	}

	private findDynamicMatches(pointer: string): Set<string> {
		const matches = new Set<string>();
		const getValue = (p: string) => (this.dataMap as any).peek(p);
		for (const [id, sub] of this.dynamicSubscriptions) {
			if (sub.compiledPattern?.match(pointer, getValue).matches)
				matches.add(id);
		}
		return matches;
	}

	private invokeHandlers(
		ids: Set<string>,
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
		originalPath: string = pointer,
	): NotificationResult {
		let cancelled = false;
		let transformedValue: unknown | undefined;
		let handlerCount = 0;
		let currentValue = value;

		// Sort ids by specificity (descending) then registration order (ascending)
		const sortedIds = Array.from(ids).sort((idA, idB) => {
			const subA = this.subscriptions.get(idA);
			const subB = this.subscriptions.get(idB);
			if (!subA || !subB) return 0;

			const specA = calculateSpecificity(subA.config.path);
			const specB = calculateSpecificity(subB.config.path);

			// Higher specificity first
			if (specA !== specB) return specB - specA;
			// Then earlier registration order
			return (subA.registrationOrder ?? 0) - (subB.registrationOrder ?? 0);
		});

		for (const id of sortedIds) {
			const sub = this.subscriptions.get(id);
			if (!sub) continue;

			// Check if this subscription cares about this event and stage
			const hasEvent = shouldInvoke(sub.config, stage, event);
			if (!hasEvent) continue;

			handlerCount++;
			const cancel = () => {
				cancelled = true;
			};

			const info: SubscriptionEventInfo = {
				type: event,
				stage,
				pointer,
				originalPath,
				operation,
				previousValue,
			};

			const ret = sub.config.fn(
				currentValue,
				info,
				cancel,
				this.dataMap,
				this.dataMap.context as any,
			);
			if (ret !== undefined) {
				transformedValue = ret;
				currentValue = ret;
			}
			if (cancelled) break;
		}

		return { cancelled, transformedValue, handlerCount };
	}

	private createPublicSubscription(
		sub: InternalSubscription<T, Ctx>,
	): Subscription {
		return {
			id: sub.id,
			query: sub.config.path,
			compiledPattern: sub.compiledPattern,
			get expandedPaths() {
				return sub.expandedPaths;
			},
			isDynamic: sub.isDynamic,
			unsubscribe: () => {
				this.unregister(sub.id);
			},
		};
	}

	private addToReverseIndex(pointer: string, subscriptionId: string): void {
		let set = this.reverseIndex.get(pointer);
		if (!set) {
			set = new Set();
			this.reverseIndex.set(pointer, set);
		}
		set.add(subscriptionId);
	}

	private removeFromReverseIndex(
		pointer: string,
		subscriptionId: string,
	): void {
		const set = this.reverseIndex.get(pointer);
		if (!set) return;
		set.delete(subscriptionId);
		if (set.size === 0) this.reverseIndex.delete(pointer);
	}

	private addStructuralWatcher(pointer: string, subscriptionId: string): void {
		let set = this.structuralWatchers.get(pointer);
		if (!set) {
			set = new Set();
			this.structuralWatchers.set(pointer, set);
		}
		set.add(subscriptionId);
	}
}
