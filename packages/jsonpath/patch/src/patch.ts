import { JSONPathError, JSONPatchError, deepEqual } from '@jsonpath/core';
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
	readonly atomic?: boolean;
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
 * JSON Patch (RFC 6902) implementation.
 */
export function applyPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const { strictMode = true, atomic = false } = options;

	const working = atomic ? structuredClone(target) : target;
	let result = working;

	patch.forEach((operation, index) => {
		try {
			validateOperation(operation);

			switch (operation.op) {
				case 'add':
					result = applyAdd(result, operation.path, operation.value);
					break;
				case 'remove':
					if (strictMode) {
						result = applyRemove(result, operation.path);
						break;
					}
					try {
						result = applyRemove(result, operation.path);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
					}
					break;
				case 'replace':
					if (strictMode) {
						result = applyReplace(result, operation.path, operation.value);
						break;
					}
					try {
						result = applyReplace(result, operation.path, operation.value);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
						result = applyAdd(result, operation.path, operation.value);
					}
					break;
				case 'move':
					result = applyMove(result, operation.from, operation.path);
					break;
				case 'copy':
					result = applyCopy(result, operation.from, operation.path);
					break;
				case 'test':
					applyTest(result, operation.path, operation.value);
					break;
				default:
					throw new JSONPatchError(
						`Unknown patch operation: ${(operation as any).op}`,
						{ operationIndex: index, operation: (operation as any).op },
					);
			}
		} catch (err) {
			if (err instanceof JSONPathError) {
				if (err instanceof JSONPatchError && err.operationIndex !== undefined) {
					throw err;
				}
				throw new JSONPatchError(err.message, {
					path: (operation as any).path,
					operationIndex: index,
					operation: operation.op,
					cause: err,
				});
			}
			throw err;
		}
	});

	if (atomic) {
		if (
			target &&
			typeof target === 'object' &&
			result &&
			typeof result === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(result)) {
				target.length = 0;
				target.push(...result);
				return target;
			}

			for (const key of Object.keys(target)) delete target[key];
			Object.assign(target, result);
			return target;
		}
		return result;
	}

	return result;
}

export function applyPatchImmutable(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const clone = structuredClone(target);
	return applyPatch(clone, patch, { ...options, atomic: false });
}

export function testPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): void {
	applyPatchImmutable(target, patch, options);
}

/**
 * Applies a patch and returns the result along with an inverse patch.
 */
export function applyWithInverse(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions & { clone?: boolean } = {},
): { result: any; inverse: PatchOperation[] } {
	const inverse: PatchOperation[] = [];
	const { clone = true } = options;
	let result = clone ? structuredClone(target) : target;

	// To generate an inverse patch, we need to record the state before each operation
	patch.forEach((operation) => {
		const pointer = new JSONPointer(operation.path);
		const oldValue = pointer.evaluate(result);

		switch (operation.op) {
			case 'add':
				result = applyAdd(result, operation.path, operation.value);
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
				result = applyRemove(result, operation.path);
				inverse.unshift({ op: 'add', path: operation.path, value: oldValue });
				break;
			case 'replace':
				result = applyReplace(result, operation.path, operation.value);
				inverse.unshift({
					op: 'replace',
					path: operation.path,
					value: oldValue,
				});
				break;
			case 'move':
				const fromPointer = new JSONPointer(operation.from);
				const fromValue = fromPointer.evaluate(result);
				result = applyMove(result, operation.from, operation.path);
				inverse.unshift({
					op: 'move',
					from: operation.path,
					path: operation.from,
				});
				break;
			case 'copy':
				result = applyCopy(result, operation.from, operation.path);
				inverse.unshift({ op: 'remove', path: operation.path });
				break;
			case 'test':
				applyTest(result, operation.path, operation.value);
				break;
		}
	});

	return { result, inverse };
}

function applyAdd(target: any, path: string, value: any): any {
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

function applyRemove(target: any, path: string): any {
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

function applyReplace(target: any, path: string, value: any): any {
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

function applyMove(target: any, from: string, path: string): any {
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
	applyRemove(target, from);
	return applyAdd(target, path, value);
}

function applyCopy(target: any, from: string, path: string): any {
	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`, 'PATH_NOT_FOUND');
	}
	return applyAdd(target, path, JSON.parse(JSON.stringify(value)));
}

function applyTest(target: any, path: string, value: any): void {
	const actual = new JSONPointer(path).evaluate(target);
	if (!deepEqual(actual, value)) {
		throw new JSONPathError(
			`Test failed: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
			'TEST_FAILED',
		);
	}
}
