import { describe, it, expect } from 'vitest';
import { query } from '@jsonpath/jsonpath';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface TestCase {
	name: string;
	selector: string;
	document?: any;
	result?: any[];
	results?: any[][];
	invalid_selector?: boolean;
}

interface ComplianceTestSuite {
	tests: TestCase[];
}

const ctsPath = join(
	process.cwd(),
	'../../../node_modules/jsonpath-compliance-test-suite/cts.json',
);
const cts: ComplianceTestSuite = JSON.parse(readFileSync(ctsPath, 'utf-8'));

describe('RFC 9535 Compliance Suite', () => {
	cts.tests.forEach((test) => {
		it(test.name, () => {
			if (test.invalid_selector) {
				expect(() => query(test.document, test.selector)).toThrow();
			} else {
				const result = query(test.document, test.selector).values();

				if (test.results) {
					// Some tests have multiple valid results
					const matched = test.results.some(
						(expected) => JSON.stringify(result) === JSON.stringify(expected),
					);
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
