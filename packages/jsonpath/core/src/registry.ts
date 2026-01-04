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
