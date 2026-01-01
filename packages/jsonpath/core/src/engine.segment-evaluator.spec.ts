import { describe, expect, it } from 'vitest';

import { nameSelector, path, segment } from '@jsonpath/ast';
import type { JsonPathPlugin } from './plugins/types';

import { createEngine } from './createEngine';

const segmentOverride: JsonPathPlugin = {
	meta: { id: 'test:segment-override' },
	setup: ({ engine }) => {
		engine.evaluators.registerSegment('Segment', () => []);
	},
};

describe('@jsonpath/core segment evaluator hook', () => {
	it('invokes a registered segment evaluator by kind', () => {
		const engine = createEngine({ plugins: [segmentOverride] });
		const compiled = {
			expression: '$.x',
			ast: path([segment([nameSelector('x')])]),
		};
		const out = engine.evaluateSync(compiled as any, { x: 1 });
		expect(out).toEqual([]);
	});
});
