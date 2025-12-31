import { removeByPointer, setByPointer } from '@jsonpath/pointer';

export function setAll(
	root: unknown,
	pointers: readonly string[],
	value: unknown,
): unknown {
	let current: unknown = root;
	for (const p of pointers) current = setByPointer(current, p, value);
	return current;
}

export function removeAll(root: unknown, pointers: readonly string[]): unknown {
	let current: unknown = root;
	for (const p of pointers) current = removeByPointer(current, p);
	return current;
}
