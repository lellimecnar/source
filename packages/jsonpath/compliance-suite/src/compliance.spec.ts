import { describe, it, expect } from 'vitest';
import { query, type EvaluatorOptions } from '@jsonpath/jsonpath';
import cts from 'jsonpath-compliance-test-suite/cts.json' assert { type: 'json' };
import { matchesOneOf } from './runner.js';

// RFC 9535 strict mode: disable extensions that allow non-standard syntax
const RFC_STRICT_OPTIONS: EvaluatorOptions = {
	arithmetic: false, // Disable unary minus and arithmetic operators
};

describe('RFC 9535 Compliance Suite', () => {
	cts.tests.forEach((test) => {
		it(test.name, () => {
			if (test.invalid_selector) {
				expect(() =>
					query(test.document, test.selector, RFC_STRICT_OPTIONS),
				).toThrow();
			} else {
				const result = query(
					test.document,
					test.selector,
					RFC_STRICT_OPTIONS,
				).values();

				if (test.results) {
					// Some tests have multiple valid results
					const matched = matchesOneOf(result, test.results);
					expect(
						matched,
						`Expected one of ${JSON.stringify(test.results)}, got ${JSON.stringify(result)}`,
					).toBe(true);
				} else if (test.result) {
					expect(result).toEqual(test.result);
				}
			}
		});
	});
});
