/**
 * @jsonpath/core
 *
 * Registries for functions, selectors, and operators.
 *
 * @packageDocumentation
 */

import type {
	FunctionDefinition,
	SelectorDefinition,
	OperatorDefinition,
} from './types.js';

/**
 * Registry for JSONPath functions (RFC 9535).
 */
export const functionRegistry = new Map<string, FunctionDefinition>();

/**
 * Registry for JSONPath selectors.
 */
export const selectorRegistry = new Map<string, SelectorDefinition>();

/**
 * Registry for JSONPath operators.
 */
export const operatorRegistry = new Map<string, OperatorDefinition>();

/**
 * Registers a function in the global registry.
 */
export function registerFunction(definition: FunctionDefinition): void {
	functionRegistry.set(definition.name, definition);
}

/**
 * Registers a selector in the global registry.
 */
export function registerSelector(definition: SelectorDefinition): void {
	selectorRegistry.set(definition.name, definition);
}

/**
 * Registers an operator in the global registry.
 */
export function registerOperator(definition: OperatorDefinition): void {
	operatorRegistry.set(definition.symbol, definition);
}
