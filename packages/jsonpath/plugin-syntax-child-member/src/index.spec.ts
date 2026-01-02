import { describe, expect, it } from 'vitest';

import { createEngine } from '@jsonpath/core';
import { plugin as root } from '@jsonpath/plugin-syntax-root';
import { plugin } from './index';

describe('@jsonpath/plugin-syntax-child-member', () => {
	it("selects $.o['j j']", () => {
		const engine = createEngine({
			plugins: [root, plugin],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const out = engine.evaluateSync(engine.compile("$.o['j j']"), {
			o: { 'j j': 42 },
		});
		expect(out).toEqual([42]);
	});
});
