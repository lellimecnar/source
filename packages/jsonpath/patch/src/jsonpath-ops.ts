import { Evaluator } from '@jsonpath/evaluator';
import { parse } from '@jsonpath/parser';

import type { PatchOperation } from './patch.js';

/**
 * Generates a set of replace operations for all matches of a JSONPath.
 */
export function replaceAll(
	target: any,
	jsonpath: string,
	value: any,
): PatchOperation[] {
	const ast = parse(jsonpath);
	const evaluator = new Evaluator(target);
	const result = evaluator.evaluate(ast);
	const paths = result.pointerStrings();
	return paths.map((path: string) => ({ op: 'replace', path, value }));
}

/**
 * Generates a set of remove operations for all matches of a JSONPath.
 * Paths are sorted in reverse order to ensure array indices remain valid during application.
 */
export function removeAll(target: any, jsonpath: string): PatchOperation[] {
	const ast = parse(jsonpath);
	const evaluator = new Evaluator(target);
	const result = evaluator.evaluate(ast);
	const paths = result.pointerStrings();

	// Sort paths in reverse order to avoid index shifts when removing from arrays
	return paths
		.sort((a: string, b: string) => b.localeCompare(a))
		.map((path: string) => ({ op: 'remove', path }));
}

/**
 * Generates a set of add operations for all matches of a JSONPath.
 */
export function addAll(
	target: any,
	jsonpath: string,
	value: any,
): PatchOperation[] {
	const ast = parse(jsonpath);
	const evaluator = new Evaluator(target);
	const result = evaluator.evaluate(ast);
	const paths = result.pointerStrings();
	return paths.map((path: string) => ({ op: 'add', path, value }));
}
