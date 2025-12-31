import { describe, expect, it } from 'vitest';

import { path, segment } from '@jsonpath/ast';

import { createEngine } from './createEngine';

import type { JsonPathPlugin } from './plugins/types';

describe('@jsonpath/core plugin hooks', () => {
	it('allows plugins to register parser + evaluator + result mapper', () => {
		const plugin: JsonPathPlugin<{ sentinel?: string }> = {
			meta: { id: 'test.plugin' },
			configure: () => undefined,
			hooks: {
				registerParsers: (parser) => {
					parser.registerSegmentParser(() =>
						path([
							segment([
								{
									kind: 'TestSelector',
								},
							]),
						]),
					);
				},
				registerEvaluators: (registry) => {
					registry.registerSelector('TestSelector', (input) => [input]);
				},
				registerResults: (registry) => {
					registry.register('value', (nodes) =>
						nodes.map((n) => ({ ok: true, v: n.value })),
					);
				},
			},
		};

		const engine = createEngine({
			plugins: [plugin],
			options: {
				plugins: {
					'test.plugin': { sentinel: 'x' },
				},
			},
		});

		const compiled = engine.compile('ignored');
		const out = engine.evaluateSync(compiled, { a: 1 });
		expect(out).toEqual([{ ok: true, v: { a: 1 } }]);
	});
});
