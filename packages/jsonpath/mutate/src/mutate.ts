import type { JsonPathEngine } from '@jsonpath/core';
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
	// Sort pointers in descending order to handle array index shifting correctly.
	// We sort by length (descending) and then lexicographically (descending).
	// This ensures that /items/1 is removed before /items/0.
	const sortedPointers = [...pointers].sort((a, b) => {
		if (a.length !== b.length) return b.length - a.length;
		return b.localeCompare(a);
	});

	let current: unknown = root;
	for (const p of sortedPointers) current = removeByPointer(current, p);
	return current;
}

export function setAllByQuery(
	engine: JsonPathEngine,
	json: unknown,
	query: string,
	value: unknown,
): unknown {
	const compiled = engine.compile(query);
	const pointers = engine.evaluateSync(compiled, json, {
		resultType: 'pointer',
	}) as string[];
	return setAll(json, pointers, value);
}

export function removeAllByQuery(
	engine: JsonPathEngine,
	json: unknown,
	query: string,
): unknown {
	const compiled = engine.compile(query);
	const pointers = engine.evaluateSync(compiled, json, {
		resultType: 'pointer',
	}) as string[];
	return removeAll(json, pointers);
}
