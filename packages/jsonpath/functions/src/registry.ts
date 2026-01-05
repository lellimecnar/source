/**
 * @jsonpath/functions
 *
 * Built-in functions for JSONPath (RFC 9535).
 *
 * @packageDocumentation
 */

import {
	type FunctionDefinition,
	registerFunction,
	Nothing,
	// ParameterType,
	// ReturnType,
} from '@jsonpath/core';

import { convertIRegexp, validateIRegexp } from './i-regexp.js';

/**
 * length(value) -> number
 */
export const lengthFn: FunctionDefinition<[unknown], number | undefined> = {
	name: 'length',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) => {
		if (typeof val === 'string') {
			// RFC 9535: length of string is number of Unicode code points
			// In JS, string.length is UTF-16 code units.
			// Array.from(string).length gives code points.
			return Array.from(val).length;
		}
		if (Array.isArray(val)) {
			return val.length;
		}
		if (val !== null && typeof val === 'object') {
			return Object.keys(val).length;
		}
		return undefined;
	},
};

/**
 * count(nodes) -> number
 */
export const countFn: FunctionDefinition<[unknown[]], number> = {
	name: 'count',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown[]) => {
		return nodes.length;
	},
};

/**
 * match(value, pattern) -> boolean (regex full match)
 */
export const matchFn: FunctionDefinition<[unknown, unknown], boolean> = {
	name: 'match',
	signature: ['ValueType', 'ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown, pattern: unknown) => {
		if (typeof pattern !== 'string') return undefined;
		if (typeof val !== 'string') return undefined;

		const validation = validateIRegexp(pattern);
		if (!validation.valid) return undefined;

		try {
			// Wrap in non-capturing group to handle alternation correctly with anchors.
			// Even though I-Regexp doesn't support (?:...), we use it here for the JS RegExp engine.
			const regex = convertIRegexp(`^(?:${pattern})$`);
			return regex.test(val);
		} catch {
			return undefined;
		}
	},
};

/**
 * search(value, pattern) -> boolean (regex partial match)
 */
export const searchFn: FunctionDefinition<[unknown, unknown], boolean> = {
	name: 'search',
	signature: ['ValueType', 'ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown, pattern: unknown) => {
		if (typeof pattern !== 'string') return undefined;
		if (typeof val !== 'string') return undefined;

		const validation = validateIRegexp(pattern);
		if (!validation.valid) return undefined;

		try {
			const regex = convertIRegexp(pattern);
			return regex.test(val);
		} catch {
			return undefined;
		}
	},
};

/**
 * value(nodes) -> any | undefined
 *
 * Returns the single value if the node list contains exactly one node.
 */
export const valueFn: FunctionDefinition<[any[]], any | undefined> = {
	name: 'value',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: any[]) => {
		if (nodes.length === 1) {
			// nodes is an array of QueryResultNode-like objects or just values?
			// In evaluator.ts, processedArgs for NodesType returns arg.nodes (QueryResultNode[])
			return nodes[0].value;
		}
		return undefined;
	},
};

function numeric(values: unknown[]): number[] {
	return values.filter(
		(v): v is number => typeof v === 'number' && Number.isFinite(v),
	);
}

export const minFn: FunctionDefinition<[unknown[]], number | undefined> = {
	name: 'min',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown[]) => {
		const nums = numeric(
			nodes.map((n: any) =>
				n && typeof n === 'object' && 'value' in n ? n.value : n,
			),
		);
		return nums.length ? Math.min(...nums) : undefined;
	},
};

export const maxFn: FunctionDefinition<[unknown[]], number | undefined> = {
	name: 'max',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown[]) => {
		const nums = numeric(
			nodes.map((n: any) =>
				n && typeof n === 'object' && 'value' in n ? n.value : n,
			),
		);
		return nums.length ? Math.max(...nums) : undefined;
	},
};

export const sumFn: FunctionDefinition<[unknown[]], number> = {
	name: 'sum',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown[]) => {
		const nums = numeric(
			nodes.map((n: any) =>
				n && typeof n === 'object' && 'value' in n ? n.value : n,
			),
		);
		return nums.reduce((a, b) => a + b, 0);
	},
};

export const avgFn: FunctionDefinition<[unknown[]], number | undefined> = {
	name: 'avg',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown[]) => {
		const nums = numeric(
			nodes.map((n: any) =>
				n && typeof n === 'object' && 'value' in n ? n.value : n,
			),
		);
		if (!nums.length) return undefined;
		return nums.reduce((a, b) => a + b, 0) / nums.length;
	},
};

export const keysFn: FunctionDefinition<[unknown], string[] | undefined> = {
	name: 'keys',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) => {
		if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
			return Object.keys(val as any);
		}
		return undefined;
	},
};

export const typeFn: FunctionDefinition<[unknown], string> = {
	name: 'type',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) => {
		if (val === null) return 'null';
		if (Array.isArray(val)) return 'array';
		return typeof val;
	},
};

export const builtins = [
	lengthFn,
	countFn,
	matchFn,
	searchFn,
	valueFn,
	minFn,
	maxFn,
	sumFn,
	avgFn,
	keysFn,
	typeFn,
] as const;

export function registerBuiltins(): void {
	for (const fn of builtins) {
		registerFunction(fn);
	}
}

export const registerBuiltinFunctions = registerBuiltins;

export function registerLength() {
	registerFunction(lengthFn);
}
export function registerCount() {
	registerFunction(countFn);
}
export function registerMatch() {
	registerFunction(matchFn);
}
export function registerSearch() {
	registerFunction(searchFn);
}
export function registerValue() {
	registerFunction(valueFn);
}
export function registerMin() {
	registerFunction(minFn);
}
export function registerMax() {
	registerFunction(maxFn);
}
export function registerSum() {
	registerFunction(sumFn);
}
export function registerAvg() {
	registerFunction(avgFn);
}
export function registerKeys() {
	registerFunction(keysFn);
}
export function registerType() {
	registerFunction(typeFn);
}

// Preserve existing behavior: built-ins are available once the package is imported.
registerBuiltins();
