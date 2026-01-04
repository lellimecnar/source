import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { evaluate } from '../evaluator.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestCase {
	name: string;
	selector: string;
	document?: any;
	result?: any[];
	results?: any[];
	invalid_selector?: boolean;
}

interface TestSuite {
	tests: TestCase[];
}

const ctsPath = path.resolve(
	__dirname,
	'../../../../../node_modules/jsonpath-compliance-test-suite/cts.json',
);

if (fs.existsSync(ctsPath)) {
	const cts: TestSuite = JSON.parse(fs.readFileSync(ctsPath, 'utf-8'));

	describe('RFC 9535 Compliance Suite', () => {
		cts.tests.forEach((test) => {
			it(test.name, () => {
				if (test.invalid_selector) {
					expect(() => parse(test.selector)).toThrow();
				} else {
					const ast = parse(test.selector);
					const result = evaluate(test.document, ast);
					const actual = result.values();

					if (test.results) {
						expect(test.results).toContainEqual(actual);
					} else if (test.result) {
						expect(actual).toEqual(test.result);
					}
				}
			});
		});
	});
} else {
	describe('RFC 9535 Compliance Suite', () => {
		it('should skip if cts.json is missing', () => {
			console.warn('cts.json not found, skipping compliance tests');
		});
	});
}
