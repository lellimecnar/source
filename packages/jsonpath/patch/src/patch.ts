import {
	JSONPathError,
	JSONPatchError,
	deepEqual,
	fastDeepClone,
} from '@jsonpath/core';
import { JSONPointer } from '@jsonpath/pointer';

export type PatchOperation =
	| { op: 'add'; path: string; value: any }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: any }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: any };

export interface ApplyOptions {
	readonly strictMode?: boolean;
	readonly mutate?: boolean;
	readonly validate?: boolean;
	readonly continueOnError?: boolean;
	readonly atomicApply?: boolean;
	readonly inverse?: boolean;
	readonly before?: (data: unknown, op: PatchOperation, index: number) => void;
	readonly after?: (
		data: unknown,
		op: PatchOperation,
		index: number,
		result: unknown,
	) => void;
}

/**
 * Validates that a patch operation has all required parameters per RFC 6902.
 * @throws {JSONPatchError} if a required parameter is missing
 */
function validateOperation(operation: Record<string, unknown>): void {
	const op = operation.op as string;

	// RFC 6902 §4.1, §4.3, §4.6: add, replace, test require 'value'
	if (
		(op === 'add' || op === 'replace' || op === 'test') &&
		!('value' in operation)
	) {
		throw new JSONPatchError(
			`Missing required 'value' parameter for '${op}' operation`,
		);
	}

	// RFC 6902 §4.4, §4.5: move, copy require 'from'
	if ((op === 'move' || op === 'copy') && !('from' in operation)) {
		throw new JSONPatchError(
			`Missing required 'from' parameter for '${op}' operation`,
		);
	}
}

/**
 * Validates a patch document without applying it.
 * @throws {JSONPatchError} if any operation is invalid
 */
export function validate(patch: PatchOperation[]): void {
	patch.forEach((op, index) => {
		try {
			validateOperation(op as any);
		} catch (err: any) {
			if (err instanceof JSONPatchError) {
				throw new JSONPatchError(err.message, {
					...err,
					operationIndex: index,
				});
			}
			throw new JSONPatchError(err.message, {
				operationIndex: index,
				operation: op.op,
			});
		}
	});
}

function unescapePointer(s: string): string {
	return s.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parseTokens(ptr: string): string[] {
	if (ptr === '') return [];
	if (!ptr.startsWith('/')) {
		throw new JSONPathError(`Invalid JSON Pointer: ${ptr}`, 'PATCH_ERROR');
	}
	// Keep empty segments (valid pointer into "" property)
	return ptr.split('/').slice(1).map(unescapePointer);
}

function getAt(doc: any, tokens: string[]): any {
	let curr = doc;
	for (const t of tokens) {
		if (curr === null || typeof curr !== 'object') return undefined;
		curr = curr[t];
	}
	return curr;
}

function setAt(
	doc: any,
	tokens: string[],
	value: any,
	_allowCreate: boolean,
): any {
	if (tokens.length === 0) return value;
	let parent = doc;
	// Always require parent path to exist - never create intermediate paths
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object') {
			throw new JSONPathError(
				`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		if (!(k in parent)) {
			throw new JSONPathError(
				`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (last === '-') {
			parent.push(value);
			return doc;
		}
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i > parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(i, 0, value);
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot add to non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	parent[last] = value;
	return doc;
}

function removeAt(doc: any, tokens: string[]): any {
	if (tokens.length === 0)
		throw new JSONPathError('Cannot remove root', 'PATCH_ERROR');
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object' || !(k in parent)) {
			throw new JSONPathError(
				`Path not found: /${tokens.join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(i, 1);
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot remove from non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	delete parent[last];
	return doc;
}

function replaceAt(doc: any, tokens: string[], value: any): any {
	if (tokens.length === 0) return value;
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object' || !(k in parent)) {
			throw new JSONPathError(
				`Path not found: /${tokens.join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent[i] = value;
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot replace in non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	parent[last] = value;
	return doc;
}

/**
 * JSON Patch (RFC 6902) implementation.
 */
export function applyPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const {
		strictMode = true,
		mutate = true,
		validate: shouldValidate = false,
		continueOnError = false,
		atomicApply = true,
		before,
		after,
	} = options;

	if (shouldValidate) {
		validate(patch);
	}

	// When atomicApply is enabled, always work on a clone and only copy back on success.
	// Note: cloning strategy is optimized in Step 3.
	const workingRoot = atomicApply
		? fastDeepClone(target)
		: mutate
			? target
			: fastDeepClone(target);
	let working = workingRoot;

	for (let index = 0; index < patch.length; index++) {
		const operation = patch[index]!;
		try {
			if (before) before(working, operation, index);
			validateOperation(operation);

			const pathTokens = parseTokens(operation.path);
			const fromTokens =
				'from' in operation ? parseTokens((operation as any).from) : null;

			let opResult = working;
			switch (operation.op) {
				case 'add':
					opResult = setAt(working, pathTokens, (operation as any).value, true);
					break;
				case 'remove':
					if (strictMode) {
						opResult = removeAt(working, pathTokens);
						break;
					}
					try {
						opResult = removeAt(working, pathTokens);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
					}
					break;
				case 'replace':
					if (strictMode) {
						opResult = replaceAt(working, pathTokens, (operation as any).value);
						break;
					}
					try {
						opResult = replaceAt(working, pathTokens, (operation as any).value);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
						opResult = setAt(
							working,
							pathTokens,
							(operation as any).value,
							true,
						);
					}
					break;
				case 'move': {
					if (!fromTokens)
						throw new JSONPatchError('Missing from', { operationIndex: index });
					if ((operation as any).from === operation.path) break;
					if (operation.path.startsWith(`${(operation as any).from}/`)) {
						throw new JSONPathError(
							'Cannot move a path to its own child',
							'PATCH_ERROR',
						);
					}
					const value = getAt(working, fromTokens);
					if (value === undefined) {
						throw new JSONPathError(
							`From path not found: ${(operation as any).from}`,
							'PATH_NOT_FOUND',
						);
					}
					removeAt(working, fromTokens);
					opResult = setAt(working, pathTokens, value, true);
					break;
				}
				case 'copy': {
					if (!fromTokens)
						throw new JSONPatchError('Missing from', { operationIndex: index });
					const value = getAt(working, fromTokens);
					if (value === undefined) {
						throw new JSONPathError(
							`From path not found: ${(operation as any).from}`,
							'PATH_NOT_FOUND',
						);
					}
					opResult = setAt(working, pathTokens, fastDeepClone(value), true);
					break;
				}
				case 'test': {
					const actual = getAt(working, pathTokens);
					if (!deepEqual(actual, (operation as any).value)) {
						throw new JSONPathError(
							`Test failed: expected ${JSON.stringify((operation as any).value)}, got ${JSON.stringify(actual)}`,
							'TEST_FAILED',
						);
					}
					break;
				}
				default:
					throw new JSONPatchError(
						`Unknown patch operation: ${(operation as any).op}`,
						{
							operationIndex: index,
							operation: (operation as any).op,
						},
					);
			}

			working = opResult;
			if (after) after(working, operation, index, opResult);
		} catch (err) {
			if (continueOnError) continue;
			if (err instanceof JSONPathError) {
				throw new JSONPatchError(err.message, {
					path: (operation as any).path,
					operationIndex: index,
					operation: operation.op,
					cause: err,
				});
			}
			throw err;
		}
	}

	// If atomic+mutate, copy back into original target now.
	if (atomicApply && mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				target.length = 0;
				target.push(...working);
				return target;
			}

			for (const key of Object.keys(target)) delete target[key];
			Object.assign(target, working);
			return target;
		}
		return working;
	}

	return working;
}

export function applyPatchImmutable(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	return applyPatch(target, patch, { ...options, mutate: false });
}

export function testPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): void {
	applyPatch(target, patch, { ...options, mutate: false });
}

/**
 * Applies a patch and returns the result along with any errors encountered.
 */
export function applyWithErrors<T>(
	target: T,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): {
	result: T;
	errors: { index: number; operation: PatchOperation; error: Error }[];
} {
	const errors: {
		index: number;
		operation: PatchOperation;
		error: Error;
	}[] = [];

	const result = applyPatch(target, patch, {
		...options,
		continueOnError: true,
		after: (data, op, index, res) => {
			if (options.after) options.after(data, op, index, res);
		},
		// We need a way to catch errors. Let's use a custom before/after or just wrap the calls.
		// Actually, let's just implement the loop here to be safe and clear.
	});

	// Re-implementing the loop for applyWithErrors to collect errors correctly
	const workingResult = fastDeepClone(target);
	let working = workingResult;

	for (let index = 0; index < patch.length; index++) {
		const operation = patch[index]!;
		try {
			if (options.before) options.before(working, operation, index);

			validateOperation(operation);

			let opResult = working;
			switch (operation.op) {
				case 'add':
					opResult = patchAdd(working, operation.path, operation.value);
					break;
				case 'remove':
					opResult = patchRemove(working, operation.path);
					break;
				case 'replace':
					opResult = patchReplace(working, operation.path, operation.value);
					break;
				case 'move':
					opResult = patchMove(working, operation.from, operation.path);
					break;
				case 'copy':
					opResult = patchCopy(working, operation.from, operation.path);
					break;
				case 'test':
					patchTest(working, operation.path, operation.value);
					break;
			}
			working = opResult;
			if (options.after) options.after(working, operation, index, opResult);
		} catch (err: any) {
			errors.push({ index, operation, error: err });
		}
	}

	if (options.mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				target.length = 0;
				target.push(...working);
			} else {
				for (const key of Object.keys(target)) delete (target as any)[key];
				Object.assign(target, working);
			}
			return { result: target, errors };
		}
	}

	return { result: working, errors };
}

/**
 * Applies a patch and returns the result along with an inverse patch.
 */
export function applyWithInverse(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): { result: any; inverse: PatchOperation[] } {
	const inverse: PatchOperation[] = [];
	const { mutate = false } = options;
	let working = fastDeepClone(target);

	// To generate an inverse patch, we need to record the state before each operation
	patch.forEach((operation) => {
		const pointer = new JSONPointer(operation.path);
		const oldValue = pointer.evaluate(working);

		switch (operation.op) {
			case 'add':
				working = patchAdd(working, operation.path, operation.value);
				if (oldValue === undefined) {
					inverse.unshift({ op: 'remove', path: operation.path });
				} else {
					inverse.unshift({
						op: 'replace',
						path: operation.path,
						value: oldValue,
					});
				}
				break;
			case 'remove':
				working = patchRemove(working, operation.path);
				inverse.unshift({ op: 'add', path: operation.path, value: oldValue });
				break;
			case 'replace':
				working = patchReplace(working, operation.path, operation.value);
				inverse.unshift({
					op: 'replace',
					path: operation.path,
					value: oldValue,
				});
				break;
			case 'move': {
				const fromPointer = new JSONPointer(operation.from);
				const fromValue = fromPointer.evaluate(working);
				working = patchMove(working, operation.from, operation.path);
				// Inverse of move is move back, but we also need to restore the value at the destination if it existed
				if (oldValue !== undefined) {
					inverse.unshift({
						op: 'add',
						path: operation.path,
						value: oldValue,
					});
				}
				inverse.unshift({
					op: 'move',
					from: operation.path,
					path: operation.from,
				});
				break;
			}
			case 'copy':
				working = patchCopy(working, operation.from, operation.path);
				if (oldValue === undefined) {
					inverse.unshift({ op: 'remove', path: operation.path });
				} else {
					inverse.unshift({
						op: 'replace',
						path: operation.path,
						value: oldValue,
					});
				}
				break;
			case 'test':
				patchTest(working, operation.path, operation.value);
				// test operations don't need an inverse as they don't mutate
				break;
		}
	});

	if (mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				target.length = 0;
				target.push(...working);
			} else {
				for (const key of Object.keys(target)) delete target[key];
				Object.assign(target, working);
			}
			return { result: target, inverse };
		}
	}

	return { result: working, inverse };
}

export function patchAdd(target: any, path: string, value: any): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		return value;
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(
			`Parent path not found: ${JSONPointer.format(parentPath)}`,
			'PATH_NOT_FOUND',
		);
	}

	if (Array.isArray(parent)) {
		if (lastKey === '-') {
			parent.push(value);
		} else {
			if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
				throw new JSONPathError(
					`Invalid array index: ${lastKey}`,
					'INVALID_ARRAY_INDEX',
				);
			}
			const index = parseInt(lastKey, 10);
			if (index < 0 || index > parent.length) {
				throw new JSONPathError(
					`Index out of bounds: ${index}`,
					'INVALID_ARRAY_INDEX',
				);
			}
			parent.splice(index, 0, value);
		}
	} else if (typeof parent === 'object' && parent !== null) {
		parent[lastKey] = value;
	} else {
		throw new JSONPathError(
			`Cannot add to non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchRemove(target: any, path: string): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		throw new JSONPathError('Cannot remove root', 'PATCH_ERROR');
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(`Path not found: ${path}`, 'PATH_NOT_FOUND');
	}

	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
			throw new JSONPathError(
				`Invalid array index: ${lastKey}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const index = parseInt(lastKey, 10);
		if (index < 0 || index >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${index}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(index, 1);
	} else if (typeof parent === 'object' && parent !== null) {
		if (!(lastKey in parent)) {
			throw new JSONPathError(
				`Property not found: ${lastKey}`,
				'PATH_NOT_FOUND',
			);
		}
		delete parent[lastKey];
	} else {
		throw new JSONPathError(
			`Cannot remove from non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchReplace(target: any, path: string, value: any): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		return value;
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(`Path not found: ${path}`, 'PATH_NOT_FOUND');
	}

	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
			throw new JSONPathError(
				`Invalid array index: ${lastKey}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const index = parseInt(lastKey, 10);
		if (index < 0 || index >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${index}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent[index] = value;
	} else if (typeof parent === 'object' && parent !== null) {
		if (!(lastKey in parent)) {
			throw new JSONPathError(
				`Property not found: ${lastKey}`,
				'PATH_NOT_FOUND',
			);
		}
		parent[lastKey] = value;
	} else {
		throw new JSONPathError(
			`Cannot replace in non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchMove(target: any, from: string, path: string): any {
	if (from === path) return target;
	if (path.startsWith(`${from}/`)) {
		throw new JSONPathError(
			`Cannot move a path to its own child: ${from} -> ${path}`,
			'PATCH_ERROR',
		);
	}

	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`, 'PATH_NOT_FOUND');
	}
	patchRemove(target, from);
	return patchAdd(target, path, value);
}

export function patchCopy(target: any, from: string, path: string): any {
	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`, 'PATH_NOT_FOUND');
	}
	return patchAdd(target, path, JSON.parse(JSON.stringify(value)));
}

export function patchTest(target: any, path: string, value: any): void {
	const actual = new JSONPointer(path).evaluate(target);
	if (!deepEqual(actual, value)) {
		throw new JSONPathError(
			`Test failed: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
			'TEST_FAILED',
		);
	}
}
