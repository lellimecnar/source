import { registerFunction, Nothing, type JSONPathPlugin } from '@jsonpath/core';

/**
 * Extra utility functions for JSONPath.
 * Provides string, array, aggregation, and utility functions.
 */
export function extras(): JSONPathPlugin {
	return {
		name: 'extras',
		onRegister: () => {
			// ========== String Functions ==========

			registerFunction({
				name: 'starts_with',
				signature: ['ValueType', 'ValueType'],
				returns: 'LogicalType',
				evaluate: (str: unknown, prefix: unknown) =>
					typeof str === 'string' &&
					typeof prefix === 'string' &&
					str.startsWith(prefix),
			});

			registerFunction({
				name: 'ends_with',
				signature: ['ValueType', 'ValueType'],
				returns: 'LogicalType',
				evaluate: (str: unknown, suffix: unknown) =>
					typeof str === 'string' &&
					typeof suffix === 'string' &&
					str.endsWith(suffix),
			});

			registerFunction({
				name: 'contains',
				signature: ['ValueType', 'ValueType'],
				returns: 'LogicalType',
				evaluate: (container: unknown, item: unknown) => {
					if (typeof container === 'string' && typeof item === 'string') {
						return container.includes(item);
					}
					if (Array.isArray(container)) {
						return container.some((x) => deepEqual(x, item));
					}
					return false;
				},
			});

			registerFunction({
				name: 'lower',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (v: unknown) =>
					typeof v === 'string' ? v.toLowerCase() : Nothing,
			});

			registerFunction({
				name: 'upper',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (v: unknown) =>
					typeof v === 'string' ? v.toUpperCase() : Nothing,
			});

			registerFunction({
				name: 'trim',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (v: unknown) => (typeof v === 'string' ? v.trim() : Nothing),
			});

			registerFunction({
				name: 'substring',
				signature: ['ValueType', 'ValueType', 'ValueType'],
				returns: 'ValueType',
				evaluate: (str: unknown, start: unknown, end: unknown) => {
					if (typeof str !== 'string') return Nothing;
					if (typeof start !== 'number') return Nothing;
					if (end !== undefined && typeof end !== 'number') return Nothing;
					return str.substring(start, end);
				},
			});

			registerFunction({
				name: 'split',
				signature: ['ValueType', 'ValueType'],
				returns: 'ValueType',
				evaluate: (str: unknown, sep: unknown) => {
					if (typeof str !== 'string' || typeof sep !== 'string')
						return Nothing;
					return str.split(sep);
				},
			});

			// ========== Array/Object Functions ==========

			registerFunction({
				name: 'keys',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (v: unknown) => {
					if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
						return Object.keys(v);
					}
					return Nothing;
				},
			});

			registerFunction({
				name: 'values',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (val: unknown) => {
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
				evaluate: (val: unknown) => {
					if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
						return Object.entries(val);
					}
					return Nothing;
				},
			});

			registerFunction({
				name: 'first',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (nodes: unknown) =>
					Array.isArray(nodes) && nodes.length > 0 ? nodes[0] : Nothing,
			});

			registerFunction({
				name: 'last',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (nodes: unknown) =>
					Array.isArray(nodes) && nodes.length > 0
						? nodes[nodes.length - 1]
						: Nothing,
			});

			registerFunction({
				name: 'reverse',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (v: unknown) =>
					Array.isArray(v) ? [...v].reverse() : Nothing,
			});

			registerFunction({
				name: 'sort',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (nodes: unknown) => {
					if (!Array.isArray(nodes)) return Nothing;
					return [...nodes].sort((a, b) => {
						if (typeof a === 'number' && typeof b === 'number') return a - b;
						if (typeof a === 'string' && typeof b === 'string')
							return a.localeCompare(b);
						return 0;
					});
				},
			});

			registerFunction({
				name: 'unique',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (nodes: unknown) => {
					if (!Array.isArray(nodes)) return Nothing;
					const seen: unknown[] = [];
					const result: unknown[] = [];
					for (const item of nodes) {
						if (!seen.some((x) => deepEqual(x, item))) {
							seen.push(item);
							result.push(item);
						}
					}
					return result;
				},
			});

			registerFunction({
				name: 'flatten',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (v: unknown) => (Array.isArray(v) ? v.flat() : Nothing),
			});

			// ========== Aggregation Functions ==========

			registerFunction({
				name: 'min',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (nodes: unknown) => {
					if (!Array.isArray(nodes) || nodes.length === 0) return Nothing;
					const nums = nodes.filter((n): n is number => typeof n === 'number');
					return nums.length > 0 ? Math.min(...nums) : Nothing;
				},
			});

			registerFunction({
				name: 'max',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (nodes: unknown) => {
					if (!Array.isArray(nodes) || nodes.length === 0) return Nothing;
					const nums = nodes.filter((n): n is number => typeof n === 'number');
					return nums.length > 0 ? Math.max(...nums) : Nothing;
				},
			});

			registerFunction({
				name: 'sum',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (nodes: unknown) => {
					if (!Array.isArray(nodes)) return Nothing;
					const nums = nodes.filter((n): n is number => typeof n === 'number');
					return nums.reduce((a, b) => a + b, 0);
				},
			});

			registerFunction({
				name: 'avg',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (nodes: unknown) => {
					if (!Array.isArray(nodes) || nodes.length === 0) return Nothing;
					const nums = nodes.filter((n): n is number => typeof n === 'number');
					if (nums.length === 0) return Nothing;
					return nums.reduce((a, b) => a + b, 0) / nums.length;
				},
			});

			// ========== Utility Functions ==========

			registerFunction({
				name: 'floor',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (v: unknown) =>
					typeof v === 'number' ? Math.floor(v) : Nothing,
			});

			registerFunction({
				name: 'ceil',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (v: unknown) =>
					typeof v === 'number' ? Math.ceil(v) : Nothing,
			});

			registerFunction({
				name: 'round',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (v: unknown) =>
					typeof v === 'number' ? Math.round(v) : Nothing,
			});

			registerFunction({
				name: 'abs',
				signature: ['ValueType'],
				returns: 'ValueType',
				evaluate: (v: unknown) =>
					typeof v === 'number' ? Math.abs(v) : Nothing,
			});
		},
	};
}

/**
 * Deep equality check for complex types.
 */
function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (typeof a === 'object' && a !== null && b !== null) {
		const aKeys = Object.keys(a as Record<string, unknown>);
		const bKeys = Object.keys(b as Record<string, unknown>);
		if (aKeys.length !== bKeys.length) return false;
		for (const key of aKeys) {
			if (
				!deepEqual(
					(a as Record<string, unknown>)[key],
					(b as Record<string, unknown>)[key],
				)
			) {
				return false;
			}
		}
		return true;
	}
	return false;
}
