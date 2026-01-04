/**
 * @jsonpath/functions
 *
 * Built-in functions for JSONPath (RFC 9535).
 *
 * @packageDocumentation
 */

import {
	type FunctionDefinition,
	// ParameterType,
	// ReturnType,
} from '@jsonpath/core';

/**
 * Registry for JSONPath functions (RFC 9535).
 */
export const functionRegistry = new Map<string, FunctionDefinition>();

/**
 * Registers a function in the global registry.
 */
export function registerFunction(definition: FunctionDefinition): void {
	functionRegistry.set(definition.name, definition);
}

/**
 * Returns a function definition by name.
 */
export function getFunction(name: string): FunctionDefinition | undefined {
	return functionRegistry.get(name);
}

/**
 * Returns true if a function exists.
 */
export function hasFunction(name: string): boolean {
	return functionRegistry.has(name);
}

/**
 * Unregisters a function by name.
 */
export function unregisterFunction(name: string): boolean {
	return functionRegistry.delete(name);
}

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
export const matchFn: FunctionDefinition<
	[unknown, unknown],
	boolean | undefined
> = {
	name: 'match',
	signature: ['ValueType', 'ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown, pattern: unknown) => {
		if (typeof pattern !== 'string') return undefined;
		if (typeof val !== 'string') return false;
		try {
			// RFC 9535: . matches any character except LF, CR, CRLF.
			// In JS, . without 's' flag matches any character except LF, CR, U+2028, U+2029.
			// We need to make it match U+2028 and U+2029.
			const processedPattern = pattern.replace(
				/\\.|\[(?:\\.|[^\]])*\]|(\.)/g,
				(m, dot) => (dot ? '[^\\n\\r]' : m),
			);
			const regex = new RegExp(`^${processedPattern}$`, 'u');
			return regex.test(val);
		} catch {
			return undefined;
		}
	},
};

/**
 * search(value, pattern) -> boolean (regex partial match)
 */
export const searchFn: FunctionDefinition<
	[unknown, unknown],
	boolean | undefined
> = {
	name: 'search',
	signature: ['ValueType', 'ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown, pattern: unknown) => {
		if (typeof pattern !== 'string') return undefined;
		if (typeof val !== 'string') return false;
		try {
			const processedPattern = pattern.replace(
				/\\.|\[(?:\\.|[^\]])*\]|(\.)/g,
				(m, dot) => (dot ? '[^\\n\\r]' : m),
			);
			const regex = new RegExp(processedPattern, 'u');
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

// Preserve existing behavior: built-ins are available once the package is imported.
registerBuiltins();
