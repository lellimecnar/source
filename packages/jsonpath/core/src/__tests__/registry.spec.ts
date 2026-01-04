import { describe, it, expect } from 'vitest';
import {
	functionRegistry,
	selectorRegistry,
	operatorRegistry,
	registerFunction,
	registerSelector,
	registerOperator,
	getFunction,
	hasFunction,
	unregisterFunction,
} from '../registry.js';
import type {
	FunctionDefinition,
	SelectorDefinition,
	OperatorDefinition,
} from '../types.js';

describe('registry', () => {
	it('should register a function', () => {
		const fn: FunctionDefinition = {
			name: 'testFn',
			signature: ['ValueType'],
			returns: 'ValueType',
			evaluate: (x) => x,
		};

		registerFunction(fn);
		expect(functionRegistry.get('testFn')).toBe(fn);
	});

	it('should register a selector', () => {
		const selector: SelectorDefinition = {
			name: 'testSelector',
			parse: () => ({}),
			evaluate: function* () {},
		};

		registerSelector(selector);
		expect(selectorRegistry.get('testSelector')).toBe(selector);
	});

	it('should register an operator', () => {
		const operator: OperatorDefinition = {
			symbol: '==',
			precedence: 10,
			associativity: 'left',
			evaluate: (a, b) => a === b,
		};

		registerOperator(operator);
		expect(operatorRegistry.get('==')).toBe(operator);
	});

	it('should get/has/unregister a function', () => {
		const fnName = 'testFnLifecycle';
		expect(hasFunction(fnName)).toBe(false);
		expect(getFunction(fnName)).toBeUndefined();

		const fn: FunctionDefinition = {
			name: fnName,
			signature: ['ValueType'],
			returns: 'ValueType',
			evaluate: (x) => x,
		};

		registerFunction(fn);
		expect(hasFunction(fnName)).toBe(true);
		expect(getFunction(fnName)).toBe(fn);

		expect(unregisterFunction(fnName)).toBe(true);
		expect(hasFunction(fnName)).toBe(false);
		expect(getFunction(fnName)).toBeUndefined();

		// deleting twice yields false
		expect(unregisterFunction(fnName)).toBe(false);
	});
});
