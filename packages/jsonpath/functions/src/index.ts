/**
 * @jsonpath/functions
 *
 * JSONPath functions implementation
 *
 * @packageDocumentation
 */

export * from './registry.js';

export {
	getFunction,
	hasFunction,
	registerFunction,
	unregisterFunction,
	functionRegistry,
} from '@jsonpath/core';
