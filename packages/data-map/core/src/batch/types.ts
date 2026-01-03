import type { Operation } from '../types';

export interface BatchContext {
	operations: Operation[];
	affectedPointers: Set<string>;
	structuralPointers: Set<string>;
}

export type BatchFn<T = void> = (dm: any) => T;
