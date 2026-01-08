export type Pointer = string;

export interface ArrayMetadata {
	length: number;
	indices: number[] | Uint32Array;
	freeSlots: number[];
	physicalPrefix: Pointer;
}

export interface FlatSnapshot {
	data: Map<Pointer, unknown>;
	versions: Map<Pointer, number>;
	arrays: Map<Pointer, ArrayMetadata>;
}
