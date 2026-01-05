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
 * Registry for JSONPath selectors.
 */
export const selectorRegistry = new Map<string, SelectorDefinition>();

/**
 * Registry for JSONPath operators.
 */
export const operatorRegistry = new Map<string, OperatorDefinition>();

/**
 * Registry for JSONPath functions.
 */
export const functionRegistry = new Map<string, FunctionDefinition>();

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

/**
 * Registers a function in the global registry.
 */
export function registerFunction(
	definition: FunctionDefinition<any, any>,
): void {
	functionRegistry.set(definition.name, definition);
}

/**
 * Returns a function definition by name.
 */
export function getFunction(
	name: string,
): FunctionDefinition<any, any> | undefined {
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
