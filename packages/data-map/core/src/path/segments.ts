export type PredicateFn = (
	value: unknown,
	key: string | number,
	parent: Record<string, unknown> | unknown[],
) => boolean;

export type PathSegment =
	| StaticSegment
	| IndexSegment
	| WildcardSegment
	| SliceSegment
	| FilterSegment
	| RecursiveDescentSegment;

export interface StaticSegment {
	readonly type: 'static';
	readonly value: string;
}

export interface IndexSegment {
	readonly type: 'index';
	readonly value: number;
}

export interface WildcardSegment {
	readonly type: 'wildcard';
}

export interface SliceSegment {
	readonly type: 'slice';
	readonly start?: number;
	readonly end?: number;
	readonly step: number;
}

export interface FilterSegment {
	readonly type: 'filter';
	readonly predicate: PredicateFn;
	readonly expression: string;
	readonly hash: string;
}

export interface RecursiveDescentSegment {
	readonly type: 'recursive';
	readonly following: PathSegment[];
}
