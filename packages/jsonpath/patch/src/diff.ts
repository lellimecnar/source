/**
 * @jsonpath/patch
 *
 * JSON Patch (RFC 6902) diff generator.
 *
 * @packageDocumentation
 */

import { deepEqual } from '@jsonpath/core';

import type { PatchOperation } from './patch.js';

/**
 * Generates a JSON Patch that transforms source into target.
 */
export function diff(
	source: any,
	target: any,
	options: { invertible?: boolean } = {},
): PatchOperation[] {
	const ops: PatchOperation[] = [];
	generateDiff(source, target, '', ops, options);
	return ops;
}

function generateDiff(
	source: any,
	target: any,
	path: string,
	ops: PatchOperation[],
	options: { invertible?: boolean },
): void {
	if (deepEqual(source, target)) {
		return;
	}

	if (
		source === null ||
		target === null ||
		typeof source !== 'object' ||
		typeof target !== 'object' ||
		Array.isArray(source) !== Array.isArray(target)
	) {
		ops.push({ op: 'replace', path, value: target });
		return;
	}

	if (Array.isArray(source)) {
		// Simple array diff: replace if different length or content
		// A more sophisticated LCS-based diff could be implemented here
		if (source.length !== target.length) {
			ops.push({ op: 'replace', path, value: target });
		} else {
			for (let i = 0; i < source.length; i++) {
				generateDiff(source[i], target[i], `${path}/${i}`, ops, options);
			}
		}
		return;
	}

	// Object diff
	const sourceKeys = Object.keys(source);
	const targetKeys = Object.keys(target);

	// Removed keys
	for (const key of sourceKeys) {
		if (!(key in target)) {
			ops.push({ op: 'remove', path: `${path}/${escape(key)}` });
		}
	}

	// Added or changed keys
	for (const key of targetKeys) {
		if (!(key in source)) {
			ops.push({
				op: 'add',
				path: `${path}/${escape(key)}`,
				value: target[key],
			});
		} else {
			generateDiff(
				source[key],
				target[key],
				`${path}/${escape(key)}`,
				ops,
				options,
			);
		}
	}
}

function escape(token: string /*8 gitleaks:allow*/): string {
	return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function createPatch(
	source: any,
	target: any,
	options?: { invertible?: boolean },
): PatchOperation[] {
	return diff(source, target, options);
}
