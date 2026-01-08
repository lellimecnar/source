export type Pointer = string;

export interface DataMapComputeHost {
	get(pointer: Pointer): unknown;
	subscribePointer(pointer: Pointer, cb: () => void): () => void;
	queryPointers(path: string): Pointer[];
	subscribePattern(path: string, cb: () => void): () => void;
}
