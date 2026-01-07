export interface AdapterFeatures {
	get: boolean;
	set: boolean;
	mutate: boolean;
	immutable: boolean;
	patch: boolean;
	subscribe: boolean;
	batch: boolean;
	definitions: boolean;
	clone: boolean;
}

export interface PatchOp {
	op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
	path: string;
	value?: unknown;
}

export interface SubscriptionHandle {
	unsubscribe: () => void;
}

export interface BenchmarkAdapter {
	name: string;
	features: AdapterFeatures;
	get?: (data: unknown, path: string) => unknown;
	set?: (data: unknown, path: string, value: unknown) => unknown;
	mutate?: (data: unknown, path: string, value: unknown) => void;
	immutableUpdate?: (data: unknown, path: string, value: unknown) => unknown;
	applyPatch?: (data: unknown, patches: PatchOp[]) => unknown;
	subscribe?: (
		data: unknown,
		callback: (data: unknown) => void,
	) => SubscriptionHandle;
	batch?: (fn: (apply: (p: string, v: unknown) => void) => void) => unknown;
	createDefinition?: (name: string, getter: (data: unknown) => unknown) => void;
	clone?: (data: unknown) => unknown;
}
