import { describe, expect, it } from 'vitest';

import { cases, documents } from './index';

describe('@lellimecnar/jsonpath-conformance', () => {
	it('exports a minimal corpus', () => {
		expect(documents.length).toBeGreaterThan(0);
		expect(cases.length).toBeGreaterThan(0);
	});
});
