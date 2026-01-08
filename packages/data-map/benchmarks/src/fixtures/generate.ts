export interface KeyDataset {
	root: unknown;
	pointers: string[];
	values: unknown[];
}

export function generateKeyDataset(size: number): KeyDataset {
	const data: Record<string, unknown> = {};
	const pointers: string[] = [];
	const values: unknown[] = [];

	for (let i = 0; i < size; i++) {
		const k = `k${String(i)}`;
		const pointer = `/data/${k}`;
		const value = i;

		data[k] = value;
		pointers.push(pointer);
		values.push(value);
	}

	return {
		root: { data },
		pointers,
		values,
	};
}

export function generateNumberArray(size: number): number[] {
	const out: number[] = [];
	for (let i = 0; i < size; i++) out.push(i);
	return out;
}
