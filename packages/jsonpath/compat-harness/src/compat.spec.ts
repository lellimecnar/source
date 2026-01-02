import { describe, expect, it } from 'vitest';

import { JSONPath } from 'jsonpath-plus';

import { documents } from '@lellimecnar/jsonpath-conformance';
import { findJsonPathPointers } from '@jsonpath/compat-jsonpath-plus';

describe('@lellimecnar/jsonpath-compat-harness', () => {
	it('compares pointer enumeration to upstream jsonpath-plus', () => {
		const doc = documents.find((d) => d.name === 'simple')!;
		const upstream = JSONPath<string[]>({
			path: '$.a.b',
			json: doc.json as any,
			wrap: true,
			resultType: 'pointer',
			eval: 'safe',
		});
		const ours = findJsonPathPointers(doc.json, '$.a.b', 'safe');
		expect(ours).toEqual(upstream);
	});
});
