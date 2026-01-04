import { describe, it, expect } from 'vitest';
import {
	selectorRegistry,
	operatorRegistry,
	registerSelector,
	registerOperator,
} from '../registry.js';
import type { SelectorDefinition, OperatorDefinition } from '../types.js';

describe('registry', () => {
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
});
