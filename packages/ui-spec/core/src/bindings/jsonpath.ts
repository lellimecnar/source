import { JSONPath } from 'jsonpath-plus';

export type JSONPathEvalMode = 'safe' | 'native' | false;

export interface ReadPathOptions {
	evalMode?: JSONPathEvalMode;
}

export interface FindPointersOptions {
	evalMode?: JSONPathEvalMode;
}

export function readJsonPath(
	json: unknown,
	path: string,
	options?: ReadPathOptions,
): unknown {
	const results = JSONPath<unknown[]>({
		path,
		json: json as any,
		wrap: true,
		eval: options?.evalMode ?? 'safe',
	});

	if (!Array.isArray(results) || results.length === 0) return undefined;
	if (results.length === 1) return results[0];
	return results;
}

export function findJsonPathPointers(
	json: unknown,
	path: string,
	options?: FindPointersOptions,
): string[] {
	const pointers = JSONPath<string[]>({
		path,
		json: json as any,
		wrap: true,
		resultType: 'pointer',
		eval: options?.evalMode ?? 'safe',
	});

	return Array.isArray(pointers) ? pointers : [];
}

function decodePointerSegment(segment: string): string {
	return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function getByJsonPointer(root: unknown, pointer: string): unknown {
	if (pointer === '' || pointer === '/') return root;
	const parts: string[] = pointer
		.split('/')
		.filter(Boolean)
		.map(decodePointerSegment);

	let current: any = root as any;
	for (const part of parts) {
		if (current == null) return undefined;
		current = current[part];
	}
	return current;
}

export function setByJsonPointer(
	root: unknown,
	pointer: string,
	value: unknown,
): { ok: true } | { ok: false; error: string } {
	if (pointer === '' || pointer === '/') {
		return {
			ok: false,
			error: 'Cannot set the document root via JSON Pointer.',
		};
	}

	const parts: string[] = pointer
		.split('/')
		.filter(Boolean)
		.map(decodePointerSegment);

	let current: any = root as any;
	for (let i = 0; i < parts.length - 1; i += 1) {
		const part = parts[i]!;
		if (
			current == null ||
			(typeof current !== 'object' && !Array.isArray(current))
		) {
			return {
				ok: false,
				error: `Cannot traverse pointer at segment "${part}".`,
			};
		}
		current = current[part];
	}

	const last = parts[parts.length - 1]!;
	if (
		current == null ||
		(typeof current !== 'object' && !Array.isArray(current))
	) {
		return {
			ok: false,
			error: `Cannot set pointer at final segment "${last}".`,
		};
	}

	current[last] = value;
	return { ok: true };
}

export function removeByJsonPointer(
	root: unknown,
	pointer: string,
): { ok: true } | { ok: false; error: string } {
	if (pointer === '' || pointer === '/') {
		return {
			ok: false,
			error: 'Cannot remove the document root via JSON Pointer.',
		};
	}

	const parts: string[] = pointer
		.split('/')
		.filter(Boolean)
		.map(decodePointerSegment);

	let current: any = root as any;
	for (let i = 0; i < parts.length - 1; i += 1) {
		const part = parts[i]!;
		if (current == null)
			return { ok: false, error: `Missing container at "${part}".` };
		current = current[part];
	}

	const last = parts[parts.length - 1]!;
	if (Array.isArray(current)) {
		const index = Number(last);
		if (!Number.isInteger(index))
			return { ok: false, error: 'Array removal requires numeric index.' };
		current.splice(index, 1);
		return { ok: true };
	}

	if (current && typeof current === 'object') {
		delete current[last];
		return { ok: true };
	}

	return { ok: false, error: 'Cannot remove from non-object container.' };
}
