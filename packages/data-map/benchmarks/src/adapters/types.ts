export type SupportFlag = true | false | 'unknown';

export type AdapterKind =
	| 'signals'
	| 'state'
	| 'immutable'
	| 'path'
	| 'pubsub'
	| 'jsonpatch'
	| 'cloning';

export interface BaseAdapter {
	kind: AdapterKind;
	/** Display name used in benchmark output (stable, human readable). */
	name: string;
}

export interface SignalHandle<T> {
	get: () => T;
	set: (value: T) => void;
}

export interface ComputedHandle<T> {
	get: () => T;
}

export interface DisposableHandle {
	dispose: () => void;
}

export interface SignalFeatures {
	supportsBatch: SupportFlag;
	supportsComputed: SupportFlag;
	supportsEffect: SupportFlag;
	/** Whether the library supports explicit disposal of a reactive scope/root. */
	supportsRootDispose: SupportFlag;
}

export interface SignalAdapter extends BaseAdapter {
	kind: 'signals';
	features: SignalFeatures;
	createSignal: <T>(initial: T) => SignalHandle<T>;
	createComputed: <T>(fn: () => T) => ComputedHandle<T>;
	createEffect: (fn: () => void) => DisposableHandle;
	batch: <T>(fn: () => T) => T;
	/** Must return true if the adapter is working in the current runtime. */
	smokeTest: () => boolean;
}

export interface StateFeatures {
	/** Whether `subscribe` is supported. */
	supportsSubscribe: SupportFlag;
	/** Whether the store API is synchronous. */
	isSync: SupportFlag;
}

export interface StateStore {
	get: (key: string) => unknown;
	set: (key: string, value: unknown) => void;
	subscribe?: (cb: () => void) => () => void;
	getSnapshot: () => unknown;
}

export interface StateAdapter extends BaseAdapter {
	kind: 'state';
	features: StateFeatures;
	createStore: (initial: Record<string, unknown>) => StateStore;
	smokeTest: () => boolean;
}

export interface ImmutableFeatures {
	mutatesInput: SupportFlag;
	pathSyntax: 'dot' | 'pointer' | 'both' | 'unknown';
}

export interface ImmutableDraft {
	get: (path: string) => unknown;
	set: (path: string, value: unknown) => void;
	del: (path: string) => void;
}

export interface ImmutableAdapter extends BaseAdapter {
	kind: 'immutable';
	features: ImmutableFeatures;
	produce: (base: unknown, recipe: (draft: ImmutableDraft) => void) => unknown;
	smokeTest: () => boolean;
}

export interface PathFeatures {
	/** Whether `set` mutates the input object. */
	mutatesInput: SupportFlag;
	/** Whether paths are dot-based, pointer-based, or both. */
	pathSyntax: 'dot' | 'pointer' | 'both' | 'unknown';
}

export interface PathAdapter extends BaseAdapter {
	kind: 'path';
	features: PathFeatures;
	get: <T = unknown>(obj: unknown, path: string) => T;
	set: (obj: unknown, path: string, value: unknown) => unknown;
	has: (obj: unknown, path: string) => boolean;
	del: (obj: unknown, path: string) => unknown;
	smokeTest: () => boolean;
}

export interface PubSubFeatures {
	/** Whether multiple listeners per event are supported. */
	supportsMultiple: SupportFlag;
	/** Whether wildcard/pattern-style subscriptions are supported. */
	supportsWildcard: SupportFlag;
}

export type PubSubHandler<T = unknown> = (data: T) => void;

export interface PubSubBus {
	on: (event: string, handler: PubSubHandler) => void;
	off: (event: string, handler: PubSubHandler) => void;
	emit: (event: string, data?: unknown) => void;
}

export interface PubSubAdapter extends BaseAdapter {
	kind: 'pubsub';
	features: PubSubFeatures;
	createBus: () => PubSubBus;
	smokeTest: () => boolean;
}

// ============================================================================
// JSON Patch Adapter (RFC 6902)
// ============================================================================

export interface JsonPatchOperation {
	op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
	path: string;
	value?: unknown;
	from?: string;
}

export interface JsonPatchFeatures {
	/** Whether the library mutates the input document. */
	mutatesInput: SupportFlag;
	/** Whether the library supports 'move' and 'copy' operations. */
	supportsMoveAndCopy: SupportFlag;
	/** Whether the library supports 'test' operations. */
	supportsTest: SupportFlag;
}

export interface JsonPatchAdapter extends BaseAdapter {
	kind: 'jsonpatch';
	features: JsonPatchFeatures;
	/** Apply a list of JSON Patch operations to a document. */
	applyPatch: (
		doc: unknown,
		operations: JsonPatchOperation[],
	) => { result: unknown; error?: Error };
	/** Generate a patch from two documents (if supported). */
	generatePatch?: (from: unknown, to: unknown) => JsonPatchOperation[];
	smokeTest: () => boolean;
}

// ============================================================================
// Cloning Adapter
// ============================================================================

export interface CloningFeatures {
	/** Whether the clone is deep (all nested objects cloned). */
	isDeep: SupportFlag;
	/** Whether the clone handles circular references. */
	handlesCircular: SupportFlag;
	/** Whether the clone preserves prototypes. */
	preservesPrototypes: SupportFlag;
}

export interface CloningAdapter extends BaseAdapter {
	kind: 'cloning';
	features: CloningFeatures;
	/** Clone an object. */
	clone: <T>(value: T) => T;
	smokeTest: () => boolean;
}
