import { registerFunction, Nothing, type JSONPathPlugin } from '@jsonpath/core';

/**
 * Arithmetic plugin for JSONPath.
 * Provides add, sub, mul, div, mod.
 */
export function arithmetic(): JSONPathPlugin {
	return {
		name: 'arithmetic',
		onRegister: () => {
			registerFunction({
				name: 'add',
				signature: ['ValueType', 'ValueType'],
				returns: 'ValueType',
				evaluate: (a: any, b: any) => {
					if (typeof a !== 'number' || typeof b !== 'number') return Nothing;
					return a + b;
				},
			});

			registerFunction({
				name: 'sub',
				signature: ['ValueType', 'ValueType'],
				returns: 'ValueType',
				evaluate: (a: any, b: any) => {
					if (typeof a !== 'number' || typeof b !== 'number') return Nothing;
					return a - b;
				},
			});

			registerFunction({
				name: 'mul',
				signature: ['ValueType', 'ValueType'],
				returns: 'ValueType',
				evaluate: (a: any, b: any) => {
					if (typeof a !== 'number' || typeof b !== 'number') return Nothing;
					return a * b;
				},
			});

			registerFunction({
				name: 'div',
				signature: ['ValueType', 'ValueType'],
				returns: 'ValueType',
				evaluate: (a: any, b: any) => {
					if (typeof a !== 'number' || typeof b !== 'number' || b === 0)
						return Nothing;
					return a / b;
				},
			});

			registerFunction({
				name: 'mod',
				signature: ['ValueType', 'ValueType'],
				returns: 'ValueType',
				evaluate: (a: any, b: any) => {
					if (typeof a !== 'number' || typeof b !== 'number' || b === 0)
						return Nothing;
					return a % b;
				},
			});
		},
	};
}
