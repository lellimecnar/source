import type { Definition, DefinitionFactory } from './definitions/types';
import type { SubscriptionConfig } from './subscription/types';

export type PathType = 'pointer' | 'relative-pointer' | 'jsonpath';

export interface CallOptions {
	strict?: boolean;
	contextPointer?: string;
	clone?: boolean;
}

export type Operation =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: unknown };

export interface ResolvedMatch {
	readonly pointer: string;
	readonly value: unknown;
	readonly readOnly?: boolean;
	readonly lastUpdated?: number;
	readonly previousValue?: unknown;
	readonly type?: string;
}

export interface DataMapOptions<T = unknown, Ctx = unknown> {
	strict?: boolean;
	context?: Ctx;
	define?: (Definition<T, Ctx> | DefinitionFactory<T, Ctx>)[];
	subscribe?: SubscriptionConfig<T, Ctx>[];
	schema?: unknown;
	/**
	 * Controls `getSnapshot()` behavior.
	 *
	 * - `'reference'` (default): return the internal data by reference (fastest)
	 * - `'clone'`: deep clone (mutation isolation)
	 * - `'frozen'`: return a shallow-frozen reference in development (helps catch accidental mutation)
	 */
	snapshotMode?: 'reference' | 'clone' | 'frozen';
	/**
	 * When false, DataMap.set(pointer, ...) will use the legacy patch-based write path.
	 * Defaults to true.
	 */
	useStructuralUpdate?: boolean;
	/**
	 * When false, DataMap will not clone the initial value in the constructor.
	 * Defaults to true to preserve current immutability guarantees.
	 */
	cloneInitial?: boolean;
}
