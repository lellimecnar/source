import { describe, it, expect } from 'vitest';

import { applyPatch } from '../patch.js';
import { loadRFC6902TestCases } from './__fixtures__/load-rfc-tests.js';
import type { RFC6902TestCase } from './__fixtures__/rfc6902-types.js';

function formatName(testCase: RFC6902TestCase, index: number): string {
	const comment = testCase.comment?.trim();
	return comment ? `${index}: ${comment}` : `${index}`;
}

function runSuite(label: string, cases: RFC6902TestCase[]): void {
	describe(label, () => {
		cases.forEach((testCase, index) => {
			const name = formatName(testCase, index);

			if (testCase.disabled) {
				it.skip(name, () => {});
				return;
			}

			// Some upstream entries can be comment-only; skip safely.
			if (!('doc' in testCase) || !('patch' in testCase)) {
				it.skip(`${name} (missing doc/patch)`, () => {});
				return;
			}

			if (typeof testCase.error === 'string') {
				// Case 1: error field present → expect the patch to throw
				it(name, () => {
					const doc = structuredClone(testCase.doc);
					const patch = structuredClone(testCase.patch);

					expect(() => applyPatch(doc, patch)).toThrow();
				});
				return;
			}

			if ('expected' in testCase) {
				// Case 2: expected field present → verify result equals expected
				it(name, () => {
					const doc = structuredClone(testCase.doc);
					const patch = structuredClone(testCase.patch);
					const expected = structuredClone(testCase.expected);

					const actual = applyPatch(doc, patch);
					expect(actual).toEqual(expected);
				});
				return;
			}

			// Case 3: neither error nor expected → just verify no error is thrown
			it(name, () => {
				const doc = structuredClone(testCase.doc);
				const patch = structuredClone(testCase.patch);

				expect(() => applyPatch(doc, patch)).not.toThrow();
			});
		});
	});
}

const specTests = loadRFC6902TestCases('spec_tests.json');
const tests = loadRFC6902TestCases('tests.json');

if (!specTests && !tests) {
	describe('RFC 6902 Compliance Suite', () => {
		it('should skip if json-patch test suite is missing', () => {
			console.warn(
				'json-patch test suite not found; install json-patch-test-suite to enable RFC 6902 compliance tests',
			);
		});
	});
} else {
	describe('RFC 6902 Compliance Suite', () => {
		if (specTests) {
			runSuite('spec_tests.json (RFC Appendix examples)', specTests);
		}
		if (tests) {
			runSuite('tests.json (extended suite)', tests);
		}
	});
}
