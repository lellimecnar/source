import { createEngine } from '@jsonpath/core';
import { setAll, removeAll } from '@jsonpath/mutate';
import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';
import { getByPointer, setByPointer, removeByPointer } from '@jsonpath/pointer';

import type { JsonPatchOp } from './types';

const engine = createEngine({ plugins: rfc9535Plugins });

export function applyPatch(doc: unknown, ops: readonly JsonPatchOp[]): unknown {
	let current: unknown = doc;
	for (const op of ops) {
		const compiled = engine.compile(op.path);
		const nodes = engine.evaluateSync(compiled, current, {
			resultType: 'pointer',
		}) as string[];

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
				}) as string[];
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
					if (JSON.stringify(val) !== JSON.stringify(op.value)) {
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
