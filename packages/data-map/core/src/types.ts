export type PathType = 'pointer' | 'relative-pointer' | 'jsonpath';

export interface CallOptions {
	strict?: boolean;
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
}
