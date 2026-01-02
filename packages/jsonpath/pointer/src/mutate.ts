import { parsePointer } from './parse';

function isObjectLike(
	value: unknown,
): value is Record<string, unknown> | unknown[] {
	return typeof value === 'object' && value !== null;
}

function cloneContainer(value: unknown): any {
	if (Array.isArray(value)) return value.slice();
	if (isObjectLike(value)) return { ...(value as any) };
	return value;
}

export function setByPointer(
	root: unknown,
	pointer: string,
	value: unknown,
): unknown {
	const parts = parsePointer(pointer);
	if (parts.length === 0)
		throw new Error('Cannot set the document root via JSON Pointer.');

	const nextRoot: any = cloneContainer(root);
	let current: any = nextRoot;
	let original: any = root as any;

	for (let i = 0; i < parts.length - 1; i += 1) {
		const part = parts[i]!;
		const origChild = isObjectLike(original)
			? (original as any)[part]
			: undefined;
		const child = cloneContainer(origChild ?? {});
		current[part] = child;
		current = child;
		original = origChild;
	}

	const last = parts[parts.length - 1]!;
	current[last] = value;
	return nextRoot;
}

export function removeByPointer(root: unknown, pointer: string): unknown {
	const parts = parsePointer(pointer);
	if (parts.length === 0)
		throw new Error('Cannot remove the document root via JSON Pointer.');

	const nextRoot: any = cloneContainer(root);
	let current: any = nextRoot;
	let original: any = root as any;

	for (let i = 0; i < parts.length - 1; i += 1) {
		const part = parts[i]!;
		const origChild = isObjectLike(original)
			? (original as any)[part]
			: undefined;
		if (!isObjectLike(origChild)) return nextRoot;
		const child = cloneContainer(origChild);
		current[part] = child;
		current = child;
		original = origChild;
	}

	const last = parts[parts.length - 1]!;
	if (Array.isArray(current)) {
		const idx = Number(last);
		if (Number.isInteger(idx)) current.splice(idx, 1);
		return nextRoot;
	}
	if (isObjectLike(current)) {
		delete (current as any)[last];
	}
	return nextRoot;
}
