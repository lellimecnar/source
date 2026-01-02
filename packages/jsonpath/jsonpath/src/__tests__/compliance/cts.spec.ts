import { describe, expect, test } from 'vitest';
// eslint-disable-next-line import/no-extraneous-dependencies
import cts from 'jsonpath-compliance-test-suite/cts.json' assert { type: 'json' };

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

export type CtsSuite = typeof cts;

export type CtsTestCase = (typeof cts.tests)[number];
export function loadCtsSuite(): CtsSuite {
	return cts;
}

type CtsCaseTuple = readonly [
	name: string,
	selector: string,
	testCase: CtsTestCase,
];

function groupNameFromTestName(name: string): string {
	const head = name.split(',')[0]?.trim();
	return head && head.length > 0 ? head : 'misc';
}

function toGroupedTuples(
	tests: CtsTestCase[],
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

describe('@lellimecnar/jsonpath-conformance (RFC 9535 CTS: values)', () => {
	const { tests: ctsTests } = loadCtsSuite();
	const engine = createRfc9535Engine({ profile: 'rfc9535-full' });

	describe.each(toGroupedTuples(ctsTests))('%s', (_group, cases) => {
		test.each(cases)('%s', (_name, _selector, tc) => {
			if (tc.invalid_selector === true) {
				expect(() => engine.compile(tc.selector)).toThrow();
				return;
			}

			const compiled = engine.compile(tc.selector);
			const out = engine.evaluateSync(compiled, tc.document);

			if (Array.isArray(tc.results)) {
				expect(tc.results).toContainEqual(out);
				return;
			}

			expect(out).toEqual(tc.result);
		});
	});
});
