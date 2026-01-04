/**
 * @jsonpath/functions
 *
 * Function registry and built-in functions for JSONPath.
 *
 * @packageDocumentation
 */

import { JSONPathError } from '@jsonpath/core';

export type FunctionArgument = any;
export type FunctionResult = any;

export interface FunctionDefinition {
	name: string;
	execute: (...args: FunctionArgument[]) => FunctionResult;
	validate?: (args: FunctionArgument[]) => void;
}

export class FunctionRegistry {
	private functions = new Map<string, FunctionDefinition>();

	public register(fn: FunctionDefinition): void {
		this.functions.set(fn.name, fn);
	}

	public get(name: string): FunctionDefinition | undefined {
		return this.functions.get(name);
	}

	public has(name: string): boolean {
		return this.functions.has(name);
	}
}

export const globalRegistry = new FunctionRegistry();

/**
 * length() - Returns the length of a string, array, or object.
 */
export const lengthFn: FunctionDefinition = {
	name: 'length',
	execute: (val: any) => {
		if (typeof val === 'string' || Array.isArray(val)) {
			return val.length;
		}
		if (val !== null && typeof val === 'object') {
			return Object.keys(val).length;
		}
		return 0;
	},
};

/**
 * count() - Returns the number of nodes in a node list.
 */
export const countFn: FunctionDefinition = {
	name: 'count',
	execute: (nodes: any[]) => {
		return Array.isArray(nodes) ? nodes.length : 0;
	},
};

/**
 * match() - Regex full match.
 */
export const matchFn: FunctionDefinition = {
	name: 'match',
	execute: (val: string, pattern: string) => {
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
 * search() - Regex partial match.
 */
export const searchFn: FunctionDefinition = {
	name: 'search',
	execute: (val: string, pattern: string) => {
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
 * value() - Extracts a single value from a node list.
 */
export const valueFn: FunctionDefinition = {
	name: 'value',
	execute: (nodes: any[]) => {
		if (Array.isArray(nodes) && nodes.length === 1) {
			return nodes[0];
		}
		return null;
	},
};

// Register built-ins
globalRegistry.register(lengthFn);
globalRegistry.register(countFn);
globalRegistry.register(matchFn);
globalRegistry.register(searchFn);
globalRegistry.register(valueFn);
