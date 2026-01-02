import { describe, expect, it } from 'vitest';

import { createEngine } from '@jsonpath/core';
import { plugin as childMember } from '@jsonpath/plugin-syntax-child-member';
import { createSyntaxRootPlugin } from '@jsonpath/plugin-syntax-root';

import { plugin } from './index';

describe('@jsonpath/plugin-syntax-descendant (value)', () => {
	it('selects all descendants matching a name', () => {
		const root = createSyntaxRootPlugin();
		const engine = createEngine({
			plugins: [root, plugin, childMember],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const out = engine.evaluateSync(engine.compile('$..x'), {
			x: 1,
			a: { x: 2 },
			b: { c: { x: 3 } },
		});
		expect(out).toEqual([1, 2, 3]);
	});
});
