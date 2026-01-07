export interface AdapterFeatures {
	/** Path-based value retrieval */
	get: boolean;
	/** Path-based value setting (returns new data) */
	set: boolean;
	/** In-place mutation */
	mutate: boolean;
	/** Immutable updates (returns new copy) */
	immutable: boolean;
	/** Immutable updates that return new copy */
	immutableUpdate: boolean;
	/** RFC 6902 JSON Patch support */
	patch: boolean;
	/** Reactive subscriptions */
	subscribe: boolean;
	/** Batched operations */
	batch: boolean;
	/** Computed/derived values */
	definitions: boolean;
	/** Deep cloning */
	clone: boolean;
	/** Array push operation */
	push: boolean;
	/** Array pop operation */
	pop: boolean;
	/** Array shift operation */
	shift: boolean;
	/** Array unshift operation */
	unshift: boolean;
	/** Array splice operation */
	splice: boolean;
	/** Array sort operation */
	sort: boolean;
	/** Map/transform operation */
	map: boolean;
	/** Multi-path set operation */
	setAll: boolean;
	/** Multi-path get operation */
	getAll: boolean;
	/** Streaming resolution */
	resolveStream: boolean;
	/** Transactional updates */
	transaction: boolean;
	/** JSONPath query support */
	jsonpathQuery: boolean;
	/** Shuffle array operation */
	shuffle: boolean;
}

export interface PatchOp {
	op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
	path: string;
	from?: string;
	value?: unknown;
}

export interface SubscriptionHandle {
	unsubscribe: () => void;
}

export interface BenchmarkAdapter {
	name: string;
	/** Short description for reports */
	description?: string;
	/** Category for grouping in reports */
	category?:
		| 'state-management'
		| 'immutable'
		| 'patch'
		| 'path-access'
		| 'clone'
		| 'full-featured';
	features: AdapterFeatures;

	// Path access
	get?: (data: unknown, path: string) => unknown;
	getAll?: (data: unknown, path: string) => unknown[];

	// Mutations
	set?: (data: unknown, path: string, value: unknown) => unknown;
	setAll?: (data: unknown, path: string, value: unknown) => unknown;
	mutate?: (data: unknown, path: string, value: unknown) => void;
	immutableUpdate?: (data: unknown, path: string, value: unknown) => unknown;
	map?: (data: unknown, path: string, fn: (v: unknown) => unknown) => unknown;

	// JSON Patch
	applyPatch?: (data: unknown, patches: PatchOp[]) => unknown;
	/** Alias for applyPatch - for convenience */
	patch?: (data: unknown, patches: PatchOp[]) => unknown;
	generatePatch?: (before: unknown, after: unknown) => PatchOp[];

	// Array operations
	push?: (data: unknown, path: string, ...items: unknown[]) => unknown;
	pop?: (data: unknown, path: string) => { data: unknown; value: unknown };
	shift?: (data: unknown, path: string) => { data: unknown; value: unknown };
	unshift?: (data: unknown, path: string, ...items: unknown[]) => unknown;
	splice?: (
		data: unknown,
		path: string,
		start: number,
		deleteCount: number,
		...items: unknown[]
	) => unknown;
	sort?: (
		data: unknown,
		path: string,
		compareFn?: (a: unknown, b: unknown) => number,
	) => unknown;

	// Subscriptions
	subscribe?: (
		data: unknown,
		callback: (data: unknown) => void,
		path?: string,
	) => (() => void) | SubscriptionHandle;
	/** Subscribe to specific path changes */
	subscribeWithPath?: (
		data: unknown,
		path: string,
		callback: (value: unknown) => void,
	) => (() => void) | SubscriptionHandle;

	// Batching
	batch?: (
		data: unknown,
		fn: (apply: (p: string, v: unknown) => void) => void,
	) => unknown;
	transaction?: (
		data: unknown,
		fn: (apply: (p: string, v: unknown) => void) => void,
	) => unknown;

	// Definitions/computed
	createDefinition?: (name: string, getter: (data: unknown) => unknown) => void;

	// Cloning
	clone?: (data: unknown) => unknown;

	// JSONPath queries
	query?: (data: unknown, expression: string) => unknown[];
	resolveStream?: (data: unknown, expression: string) => Iterable<unknown>;

	// Array helpers
	shuffle?: (data: unknown, path: string) => unknown;

	// Setup/teardown for stateful adapters
	setup?: (data: unknown) => unknown;
	teardown?: () => void;
}
