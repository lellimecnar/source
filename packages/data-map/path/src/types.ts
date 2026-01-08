export type Pointer = string;

export interface QueryResult {
	values: unknown[];
	pointers: Pointer[];
}
