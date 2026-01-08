import { evaluate } from '@jsonpath/evaluator';
import { parse } from '@jsonpath/parser';
import { applyPatch } from '@jsonpath/patch';

import type { BenchmarkAdapter, PatchOp } from './types.js';

export const jsonpathRawAdapter: BenchmarkAdapter = {
	name: '@jsonpath/*',
	description: 'RFC 9535 JSONPath with RFC 6902 Patch support',
	category: 'full-featured',
	features: {
		get: true,
		set: false,
		mutate: false,
		immutable: false,
		patch: true,
		subscribe: false,
		batch: false,
		definitions: false,
		clone: false,
		push: false,
		pop: false,
		shift: false,
		unshift: false,
		splice: false,
		sort: false,
		map: false,
		setAll: false,
		resolveStream: false,
		transaction: false,
		immutableUpdate: false,
		getAll: true,
		jsonpathQuery: true,
		shuffle: false,
	},
	get: (data: unknown, path: string) => {
		// Handle JSON Pointer format
		if (path.startsWith('/')) {
			const jsonPath = `$${path
				.split('/')
				.filter(Boolean)
				.map((p) => `['${p}']`)
				.join('')}`;
			const ast = parse(jsonPath);
			const result = evaluate(data, ast);
			return result.values()[0];
		}
		const ast = parse(path);
		const result = evaluate(data, ast);
		return result.values()[0];
	},
	getAll: (data: unknown, path: string) => {
		const ast = parse(path);
		const result = evaluate(data, ast);
		return result.values();
	},
	applyPatch: (data: unknown, patches: PatchOp[]) => {
		return applyPatch(data, patches as any);
	},
	patch: (data: unknown, patches: PatchOp[]) => {
		return applyPatch(data, patches as any);
	},
};
