import { describe, expect, it } from 'vitest';

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

import { cases, documents, runConformanceCase } from './index';

describe('@lellimecnar/jsonpath-conformance', () => {
	it('exports a corpus with documents + cases', () => {
		expect(documents.length).toBeGreaterThan(0);
		expect(cases.length).toBeGreaterThan(0);
	});

	it.fails('RFC 9535 (draft): root normalized path ($)', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-draft' });
		const testCase = cases.find((c) => c.query === '$')!;
		const out = runConformanceCase(engine, testCase, { resultType: 'path' });
		expect(out).toEqual(['$']);
	});

	it.fails("RFC 9535 (draft): $.o['j j'] selects the member value", () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-draft' });
		const testCase = cases.find((c) => c.query.includes("['j j']"))!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual([42]);
	});
});
