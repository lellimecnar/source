import { describe, expect, test } from 'vitest';

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

import type { CtsTestCase } from './cts';
import { loadCtsSuite } from './cts';

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
		test.each(cases)('%s', (_name, selector, tc) => {
			if (tc.invalid_selector === true) {
				expect(() => engine.compile(selector)).toThrow();
				return;
			}

			const compiled = engine.compile(selector);
			const out = engine.evaluateSync(compiled, tc.document);

			if (Array.isArray(tc.results)) {
				expect(tc.results).toContainEqual(out);
				return;
			}

			expect(out).toEqual(tc.result);
		});
	});
});
