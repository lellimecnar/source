import { describe, expect, it } from 'vitest';

import {
	JsonPathError,
	JsonPathErrorCodes,
	appendIndex,
	appendMember,
	createEngine,
	rootLocation,
	rootNode,
} from './index';

describe('@jsonpath/core (additional)', () => {
	it('rootLocation() is empty and allocates a fresh array', () => {
		const a = rootLocation();
		const b = rootLocation();
		expect(a.components).toEqual([]);
		expect(b.components).toEqual([]);
		expect(a.components).not.toBe(b.components);
	});

	it('appendMember() is immutable', () => {
		const base = rootLocation();
		const next = appendMember(base, 'x');
		expect(base.components).toEqual([]);
		expect(next.components).toEqual([{ kind: 'member', name: 'x' }]);
	});

	it('appendIndex() is immutable', () => {
		const base = rootLocation();
		const next = appendIndex(base, 0);
		expect(base.components).toEqual([]);
		expect(next.components).toEqual([{ kind: 'index', index: 0 }]);
	});

	it('rootNode() sets value, root, and root location', () => {
		const json = { a: 1 };
		const node = rootNode(json);
		expect(node.value).toBe(json);
		expect(node.root).toBe(json);
		expect(node.location.components).toEqual([]);
	});

	it('engine with no plugins evaluates to the root node by default', () => {
		const engine = createEngine({ plugins: [] });
		const compiled = engine.compile('$.anything');
		const out = engine.evaluateSync(compiled, { a: 1 });
		expect(out).toEqual([{ a: 1 }]);

		const nodes = engine.evaluateSync(
			compiled,
			{ a: 1 },
			{ resultType: 'node' },
		);
		expect((nodes as any[])[0]).toMatchObject({ value: { a: 1 } });
	});

	it('throws a JsonPathError for unknown resultType', () => {
		const engine = createEngine({ plugins: [] });
		expect(() =>
			engine.evaluateSync(
				engine.compile('$'),
				{ a: 1 },
				{ resultType: 'nope' as any },
			),
		).toThrow(JsonPathError);
		try {
			engine.evaluateSync(
				engine.compile('$'),
				{ a: 1 },
				{ resultType: 'nope' as any },
			);
		} catch (err) {
			expect((err as any).code).toBe(JsonPathErrorCodes.Config);
		}
	});
});
