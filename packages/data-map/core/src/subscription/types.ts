import type { DataMap } from '../datamap';
import type { CompiledPathPattern } from '../path/compile';
import type { Operation } from '../types';

export interface SubscriptionConfig<T, Ctx = unknown> {
	path: string;
	before?: SubscriptionEvent | SubscriptionEvent[];
	on?: SubscriptionEvent | SubscriptionEvent[];
	after?: SubscriptionEvent | SubscriptionEvent[];
	fn: SubscriptionHandler<T, Ctx>;
}

export type SubscriptionEvent = 'get' | 'set' | 'remove' | 'resolve' | 'patch';

export interface SubscriptionEventInfo {
	type: SubscriptionEvent;
	stage: 'before' | 'on' | 'after';
	pointer: string;
	originalPath: string;
	operation?: Operation;
	previousValue?: unknown;
}

export type SubscriptionHandler<T, Ctx> = (
	value: unknown,
	event: SubscriptionEventInfo,
	cancel: () => void,
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown | void;

export interface Subscription {
	readonly id: string;
	readonly query: string;
	readonly compiledPattern: CompiledPathPattern | null;
	readonly expandedPaths: ReadonlySet<string>;
	readonly isDynamic: boolean;
	unsubscribe: () => void;
}
