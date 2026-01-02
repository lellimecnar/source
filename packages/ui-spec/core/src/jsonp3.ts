import { JSONPathEnvironment, jsonpath, type JSONValue } from 'json-p3';

import { UISpecError } from './errors';

export type Jsonp3Match = { value: unknown; pointer: string };

export type Jsonp3Evaluator = {
	findAll(path: string, doc: unknown): Jsonp3Match[];
};

export type Jsonp3FunctionRegister = Map<string, unknown>;

export function createJsonp3FunctionRegistry(): Jsonp3FunctionRegister {
	// json-p3 exposes a function register on JSONPathEnvironment. We use that Map
	// as the backing store for UI-Spec callable functions (no embedded strings).
	const env = new JSONPathEnvironment();
	// Make it explicit that UI-Spec controls what is registered.
	env.functionRegister.clear();
	return env.functionRegister as unknown as Map<string, unknown>;
}

export function createJsonp3Evaluator(): Jsonp3Evaluator {
	if (!jsonpath?.query) {
		throw new UISpecError(
			'UI_SPEC_JSONP3_API_MISSING',
			'json-p3 jsonpath.query is missing',
		);
	}

	return {
		findAll(path: string, doc: unknown): Jsonp3Match[] {
			const nodes = jsonpath.query(path, doc as JSONValue);
			return nodes.nodes.map((node) => ({
				value: node.value,
				pointer: node.toPointer().toString(),
			}));
		},
	};
}
