/**
 * @jsonpath/functions
 *
 * Built-in functions for JSONPath (RFC 9535).
 *
 * @packageDocumentation
 */

import {
	registerFunction,
	type FunctionDefinition,
	// ParameterType,
	// ReturnType,
} from '@jsonpath/core';

/**
 * length(value) -> number
 */
export const lengthFn: FunctionDefinition<[unknown], number> = {
	name: 'length',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) => {
		if (typeof val === 'string' || Array.isArray(val)) {
			return val.length;
		}
		if (val !== null && typeof val === 'object') {
			return Object.keys(val as object).length;
		}
		return 0;
	},
};

/**
 * count(nodes) -> number
 */
export const countFn: FunctionDefinition<[unknown], number> = {
	name: 'count',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown) => {
		return Array.isArray(nodes) ? nodes.length : 0;
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
		if (typeof val !== 'string' || typeof pattern !== 'string') return false;
		try {
			const regex = new RegExp(`^${pattern}$`);
			return regex.test(val);
		} catch {
			return false;
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
		if (typeof val !== 'string' || typeof pattern !== 'string') return false;
		try {
			const regex = new RegExp(pattern);
			return regex.test(val);
		} catch {
			return false;
		}
	},
};

/**
 * value(nodes) -> any | null
 *
 * Returns the single value if the node list contains exactly one node.
 */
export const valueFn: FunctionDefinition<[unknown], unknown> = {
	name: 'value',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown) => {
		if (Array.isArray(nodes) && nodes.length === 1) {
			return nodes[0];
		}
		return null;
	},
};

export const builtins = [
	lengthFn,
	countFn,
	matchFn,
	searchFn,
	valueFn,
] as const;

export function registerBuiltins(): void {
	for (const fn of builtins) {
		registerFunction(fn);
	}
}

// Preserve existing behavior: built-ins are available once the package is imported.
registerBuiltins();
