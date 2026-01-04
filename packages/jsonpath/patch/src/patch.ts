import { JSONPointer } from '@jsonpath/pointer';
import { JSONPathError } from '@jsonpath/core';

export type PatchOperation =
	| { op: 'add'; path: string; value: any }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: any }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: any };

/**
 * JSON Patch (RFC 6902) implementation.
 */
export function applyPatch(target: any, patch: PatchOperation[]): any {
	let result = JSON.parse(JSON.stringify(target)); // Deep clone

	for (const operation of patch) {
		switch (operation.op) {
			case 'add':
				result = applyAdd(result, operation.path, operation.value);
				break;
			case 'remove':
				result = applyRemove(result, operation.path);
				break;
			case 'replace':
				result = applyReplace(result, operation.path, operation.value);
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
				throw new JSONPathError(
					`Unknown patch operation: ${(operation as any).op}`,
				);
		}
	}

	return result;
}

function applyAdd(target: any, path: string, value: any): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		return value;
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1];
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(
			`Parent path not found: ${JSONPointer.format(parentPath)}`,
		);
	}

	if (Array.isArray(parent)) {
		if (lastKey === '-') {
			parent.push(value);
		} else {
			const index = parseInt(lastKey, 10);
			if (isNaN(index) || index < 0 || index > parent.length) {
				throw new JSONPathError(`Invalid array index: ${lastKey}`);
			}
			parent.splice(index, 0, value);
		}
	} else if (typeof parent === 'object' && parent !== null) {
		parent[lastKey] = value;
	} else {
		throw new JSONPathError(`Cannot add to non-object/non-array parent`);
	}

	return target;
}

function applyRemove(target: any, path: string): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		throw new JSONPathError('Cannot remove root');
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1];
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(`Path not found: ${path}`);
	}

	if (Array.isArray(parent)) {
		const index = parseInt(lastKey, 10);
		if (isNaN(index) || index < 0 || index >= parent.length) {
			throw new JSONPathError(`Invalid array index: ${lastKey}`);
		}
		parent.splice(index, 1);
	} else if (typeof parent === 'object' && parent !== null) {
		if (!(lastKey in parent)) {
			throw new JSONPathError(`Property not found: ${lastKey}`);
		}
		delete parent[lastKey];
	} else {
		throw new JSONPathError(`Cannot remove from non-object/non-array parent`);
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
	const lastKey = tokens[tokens.length - 1];
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(`Path not found: ${path}`);
	}

	if (Array.isArray(parent)) {
		const index = parseInt(lastKey, 10);
		if (isNaN(index) || index < 0 || index >= parent.length) {
			throw new JSONPathError(`Invalid array index: ${lastKey}`);
		}
		parent[index] = value;
	} else if (typeof parent === 'object' && parent !== null) {
		if (!(lastKey in parent)) {
			throw new JSONPathError(`Property not found: ${lastKey}`);
		}
		parent[lastKey] = value;
	} else {
		throw new JSONPathError(`Cannot replace in non-object/non-array parent`);
	}

	return target;
}

function applyMove(target: any, from: string, path: string): any {
	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`);
	}
	applyRemove(target, from);
	return applyAdd(target, path, value);
}

function applyCopy(target: any, from: string, path: string): any {
	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`);
	}
	return applyAdd(target, path, JSON.parse(JSON.stringify(value)));
}

function applyTest(target: any, path: string, value: any): void {
	const actual = new JSONPointer(path).evaluate(target);
	if (JSON.stringify(actual) !== JSON.stringify(value)) {
		throw new JSONPathError(
			`Test failed: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
		);
	}
}
