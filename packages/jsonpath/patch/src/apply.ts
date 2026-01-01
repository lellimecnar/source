import type { JsonPathEngine, JsonPathPlugin } from '@jsonpath/core';
import { createEngine } from '@jsonpath/core';
import { setAll, removeAll } from '@jsonpath/mutate';
import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';
import { getByPointer, setByPointer, removeByPointer } from '@jsonpath/pointer';

import type { JsonPatchOp } from './types';

export interface ApplyPatchOptions {
	engine?: JsonPathEngine;
	plugins?: JsonPathPlugin[];
	engineOptions?: {
		maxDepth?: number;
		maxResults?: number;
		plugins?: Record<string, unknown>;
	};
	compare?: (actual: unknown, expected: unknown) => boolean;
}

let defaultEngine: JsonPathEngine | undefined;

function getEngine(options?: ApplyPatchOptions): JsonPathEngine {
	if (options?.engine) return options.engine;
	if (options?.plugins) {
		return createEngine({
			plugins: options.plugins,
			options: options.engineOptions as any,
		});
	}
	defaultEngine ??= createEngine({ plugins: rfc9535Plugins });
	return defaultEngine;
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function defaultCompare(actual: unknown, expected: unknown): boolean {
	return JSON.stringify(actual) === JSON.stringify(expected);
}

export function applyPatch(
	doc: unknown,
	ops: readonly JsonPatchOp[],
	options?: ApplyPatchOptions,
): unknown {
	const engine = getEngine(options);
	const compare = options?.compare ?? defaultCompare;

	let current: unknown = doc;
	for (const op of ops) {
		const compiled = engine.compile(op.path);
		const nodes = engine.evaluateSync(compiled, current, {
			resultType: 'pointer',
		});
		if (!isStringArray(nodes)) {
			throw new Error(
				`Expected resultType "pointer" to return string[], got: ${typeof nodes}`,
			);
		}

		switch (op.op) {
			case 'add':
			case 'replace':
				current = setAll(current, nodes, op.value);
				break;

			case 'remove':
				current = removeAll(current, nodes);
				break;

			case 'move':
			case 'copy': {
				const fromCompiled = engine.compile(op.from);
				const fromNodes = engine.evaluateSync(fromCompiled, current, {
					resultType: 'pointer',
				});
				if (!isStringArray(fromNodes)) {
					throw new Error(
						`Expected resultType "pointer" to return string[], got: ${typeof fromNodes}`,
					);
				}
				for (const toP of nodes) {
					for (const fromP of fromNodes) {
						const val = getByPointer(current, fromP);
						current = setByPointer(current, toP, val);
						if (op.op === 'move') {
							current = removeByPointer(current, fromP);
						}
					}
				}
				break;
			}

			case 'test':
				for (const p of nodes) {
					const val = getByPointer(current, p);
					if (!compare(val, op.value)) {
						throw new Error(`Test failed at path: ${op.path} (pointer: ${p})`);
					}
				}
				break;

			default: {
				const _exhaustive: never = op;
				throw new Error('Unsupported JSON Patch operation');
			}
		}
	}
	return current;
}
