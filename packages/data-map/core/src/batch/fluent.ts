import type { DataMap } from '../datamap';
import type { CallOptions, Operation } from '../types';

// Spec-required fluent batch interface (spec §4.9).
// The concrete implementation is exposed via `DataMap.batch`.
export interface Batch<Target extends DataMap<any, any>> {
	set: (pathOrPointer: string, value: unknown, options?: CallOptions) => this;
	remove: (pathOrPointer: string, options?: CallOptions) => this;
	merge: (pathOrPointer: string, value: object, options?: CallOptions) => this;
	move: (from: string, to: string, options?: CallOptions) => this;
	copy: (from: string, to: string, options?: CallOptions) => this;
	apply: () => Target;
	toPatch: () => Operation[];
}
