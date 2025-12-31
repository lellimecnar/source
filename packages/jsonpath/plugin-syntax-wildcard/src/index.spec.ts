import { describe, expect, it } from 'vitest';

import { createEngine } from '@jsonpath/core';
import { plugin as root } from '@jsonpath/plugin-syntax-root';
import { plugin } from './index';

describe('@jsonpath/plugin-syntax-wildcard (value)', () => {
	it('selects all array items', () => {
		const engine = createEngine({
			plugins: [root, plugin],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const out = engine.evaluateSync(engine.compile('$[*]'), [1, 2, 3]);
		expect(out).toEqual([1, 2, 3]);
	});
});
