import {
	type JSONPathPlugin,
	type PluginContext,
	type FunctionDefinition,
	registerFunction,
	Nothing,
} from '@jsonpath/core';

/**
 * Type predicate functions
 */

export const isStringFn: FunctionDefinition<[unknown], boolean> = {
	name: 'is_string',
	signature: ['ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown) => typeof val === 'string',
};

export const isNumberFn: FunctionDefinition<[unknown], boolean> = {
	name: 'is_number',
	signature: ['ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown) => typeof val === 'number' && !isNaN(val),
};

export const isBooleanFn: FunctionDefinition<[unknown], boolean> = {
	name: 'is_boolean',
	signature: ['ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown) => typeof val === 'boolean',
};

export const isObjectFn: FunctionDefinition<[unknown], boolean> = {
	name: 'is_object',
	signature: ['ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown) =>
		val !== null && typeof val === 'object' && !Array.isArray(val),
};

export const isArrayFn: FunctionDefinition<[unknown], boolean> = {
	name: 'is_array',
	signature: ['ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown) => Array.isArray(val),
};

export const isNullFn: FunctionDefinition<[unknown], boolean> = {
	name: 'is_null',
	signature: ['ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown) => val === null,
};

/**
 * Coercion functions
 */

export const toStringFn: FunctionDefinition<[unknown], string | Nothing> = {
	name: 'to_string',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) => {
		if (val === null) return 'null';
		if (typeof val === 'string') return val;
		if (typeof val === 'number' || typeof val === 'boolean') return String(val);
		if (typeof val === 'object') return JSON.stringify(val);
		return Nothing;
	},
};

export const toNumberFn: FunctionDefinition<[unknown], number | Nothing> = {
	name: 'to_number',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) => {
		if (typeof val === 'number') return val;
		if (typeof val === 'string') {
			const n = Number(val);
			return isNaN(n) ? Nothing : n;
		}
		if (typeof val === 'boolean') return val ? 1 : 0;
		return Nothing;
	},
};

export const toBooleanFn: FunctionDefinition<[unknown], boolean> = {
	name: 'to_boolean',
	signature: ['ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown) => {
		if (typeof val === 'boolean') return val;
		if (typeof val === 'number') return val !== 0 && !isNaN(val);
		if (typeof val === 'string') return val.length > 0;
		if (Array.isArray(val)) return val.length > 0;
		if (val !== null && typeof val === 'object')
			return Object.keys(val).length > 0;
		return false;
	},
};

/**
 * Plugin that registers type predicate and coercion functions.
 */
export class TypePlugin implements JSONPathPlugin {
	public readonly name = 'types';
	public readonly version = '0.1.0';

	onRegister(_ctx: PluginContext): void {
		registerFunction(isStringFn);
		registerFunction(isNumberFn);
		registerFunction(isBooleanFn);
		registerFunction(isObjectFn);
		registerFunction(isArrayFn);
		registerFunction(isNullFn);
		registerFunction(toStringFn);
		registerFunction(toNumberFn);
		registerFunction(toBooleanFn);
	}
}

export function types(): JSONPathPlugin {
	return new TypePlugin();
}
