// eslint-disable-next-line import/no-extraneous-dependencies -- installed via napa
import cts from 'jsonpath-compliance-test-suite/cts.json' assert { type: 'json' };

export type CtsSuite = typeof cts;

export type CtsTestCase = (typeof cts.tests)[number];
export function loadCtsSuite(): CtsSuite {
	return cts;
}
