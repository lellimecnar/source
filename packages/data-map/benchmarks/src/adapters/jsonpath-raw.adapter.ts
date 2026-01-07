import { compile } from '@jsonpath/compiler';
import { evaluate } from '@jsonpath/evaluator';
import type { BenchmarkAdapter } from './types.js';

export const jsonpathRawAdapter: BenchmarkAdapter = {
	name: '@jsonpath/* (raw)',
	features: {
		get: true,
		set: false,
		mutate: false,
		immutable: false,
		patch: false,
		subscribe: false,
		batch: false,
		definitions: false,
		clone: false,
	},
	get: (data: unknown, path: string) => {
		const compiled = compile(path);
		const result = evaluate(data, compiled);
		return result[0];
	},
};
