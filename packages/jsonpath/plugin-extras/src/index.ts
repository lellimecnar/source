import { registerFunction, Nothing, type JSONPathPlugin } from '@jsonpath/core';

/**
 * Extra utility functions for JSONPath.
 * Provides values, entries, flatten, unique.
 */
export function extras(): JSONPathPlugin {
	return {
		name: 'extras',
		onRegister: () => {
			registerFunction({
				name: 'values',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (val: any) => {
					if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
						return Object.values(val);
					}
					return Nothing;
				},
			});

			registerFunction({
				name: 'entries',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (val: any) => {
					if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
						return Object.entries(val);
					}
					return Nothing;
				},
			});

			registerFunction({
				name: 'flatten',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (val: any) => {
					if (Array.isArray(val)) {
						return val.flat();
					}
					return Nothing;
				},
			});

			registerFunction({
				name: 'unique',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (val: any) => {
					if (Array.isArray(val)) {
						// Simple unique for primitives
						return Array.from(new Set(val));
					}
					return Nothing;
				},
			});
		},
	};
}
