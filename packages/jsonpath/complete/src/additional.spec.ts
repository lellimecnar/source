import { describe, expect, it } from 'vitest';

import { createCompleteEngine, completePlugins, rfc9535Plugins } from './index';

describe('@jsonpath/complete (additional)', () => {
	it('exports a plugin list that extends rfc9535Plugins', () => {
		expect(completePlugins.length).toBeGreaterThan(rfc9535Plugins.length);
	});

	it('creates an engine capable of evaluating basic selectors', () => {
		const engine = createCompleteEngine();
		const out = engine.evaluateSync(engine.compile('$.a'), { a: 1 });
		expect(out).toEqual([1]);
	});

	it('supports resultType=pointer via plugin-result-types wiring', () => {
		const engine = createCompleteEngine();
		const out = engine.evaluateSync(
			engine.compile('$.a.b'),
			{ a: { b: 1 } },
			{ resultType: 'pointer' },
		);
		expect(out).toEqual(['/a/b']);
	});

	it('supports resultType=path via plugin-result-types wiring', () => {
		const engine = createCompleteEngine();
		const out = engine.evaluateSync(
			engine.compile("$.o['j j']"),
			{ o: { 'j j': 42 } },
			{ resultType: 'path' },
		);
		expect(out).toEqual(["$.o['j j']"]);
	});

	it('supports resultType=node (built-in)', () => {
		const engine = createCompleteEngine();
		const nodes = engine.evaluateSync(
			engine.compile('$.a'),
			{ a: 1 },
			{ resultType: 'node' },
		) as any[];
		expect(nodes[0]).toMatchObject({ value: 1 });
	});
});
