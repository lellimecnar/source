import { describe, expect, test } from 'vitest';

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

import type {
	CtsDeterministicTestCase,
	CtsNonDeterministicTestCase,
	CtsTestCase,
} from './cts';
import { loadCtsSuite } from './cts';

type CtsValidCase = CtsDeterministicTestCase | CtsNonDeterministicTestCase;
type CtsCaseTuple = readonly [
	name: string,
	selector: string,
	testCase: CtsValidCase,
];

function groupNameFromTestName(name: string): string {
	const head = name.split(',')[0]?.trim();
	return head && head.length > 0 ? head : 'misc';
}

function toGroupedTuples(
	tests: CtsValidCase[],
): Array<readonly [group: string, cases: CtsCaseTuple[]]> {
	const groups = new Map<string, CtsCaseTuple[]>();
	for (const t of tests) {
		const group = groupNameFromTestName(String(t.name));
		const list = groups.get(group) ?? [];
		list.push([String(t.name), String(t.selector), t] as const);
		groups.set(group, list);
	}
	return [...groups.entries()];
}

describe('@lellimecnar/jsonpath-conformance (RFC 9535 CTS: paths)', () => {
	const { tests } = loadCtsSuite();
	const ctsTests = tests.filter((t): t is CtsValidCase => {
		const tc: CtsTestCase = t;
		return !('invalid_selector' in tc && tc.invalid_selector === true);
	});
	const engine = createRfc9535Engine({ profile: 'rfc9535-full' });

	describe.each(toGroupedTuples(ctsTests))('%s', (_group, cases) => {
		test.each(cases)('%s', (_name, selector, tc) => {
			const compiled = engine.compile(selector);
			const out = engine.evaluateSync(compiled, tc.document, {
				resultType: 'path',
			} as any);

			if (Array.isArray(tc.results_paths)) {
				expect(tc.results_paths).toContainEqual(out);
				return;
			}

			expect(out).toEqual(tc.result_paths);
		});
	});
});
