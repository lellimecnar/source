import { describe, expect, it } from 'vitest';

import { JSONPath } from 'jsonpath-plus';

import { findJsonPathPointers } from '@jsonpath/compat-jsonpath-plus';

describe('@lellimecnar/jsonpath-compat-harness', () => {
	it('compares pointer enumeration to upstream jsonpath-plus', () => {
		const json = {
			a: {
				b: 'abc123',
			},
		};
		const upstream = JSONPath<string[]>({
			path: '$.a.b',
			json,
			wrap: true,
			resultType: 'pointer',
			eval: 'safe',
		});
		const ours = findJsonPathPointers(json, '$.a.b', 'safe');
		expect(ours).toEqual(upstream);
	});
});
