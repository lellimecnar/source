import { describe, expect, it } from 'vitest';

import { resolvePlugins } from './resolve';

function plugin(
	id: string,
	caps: string[] = [],
	deps: string[] = [],
	optionalDeps: string[] = [],
) {
	return {
		meta: {
			id,
			capabilities: caps,
			dependsOn: deps,
			optionalDependsOn: optionalDeps,
		},
	};
}

describe('resolvePlugins', () => {
	it('orders deterministically by plugin id', () => {
		const result = resolvePlugins([plugin('b'), plugin('a')]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual(['a', 'b']);
	});

	it('orders dependencies before dependents', () => {
		// Id ordering alone would produce a, c; but deps require c before a.
		const result = resolvePlugins([plugin('a', [], ['c']), plugin('c')]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual(['c', 'a']);
	});

	it('treats optional dependencies as ordering constraints when present', () => {
		const result = resolvePlugins([plugin('a', [], [], ['c']), plugin('c')]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual(['c', 'a']);
	});

	it('does not throw when optional dependencies are missing', () => {
		const result = resolvePlugins([plugin('a', [], [], ['missing'])]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual(['a']);
	});

	it('throws when required dependencies are missing', () => {
		expect(() => resolvePlugins([plugin('a', [], ['missing'])])).toThrow(
			/Missing required plugin dependency/,
		);
	});

	it('throws on duplicate plugin ids', () => {
		expect(() => resolvePlugins([plugin('a'), plugin('a')])).toThrow(
			/Duplicate plugin ids provided/,
		);
	});

	it('throws on dependency cycles', () => {
		expect(() =>
			resolvePlugins([plugin('a', [], ['b']), plugin('b', [], ['a'])]),
		).toThrow(/Plugin dependency cycle detected/);
	});

	it('throws on capability conflicts', () => {
		expect(() =>
			resolvePlugins([plugin('a', ['cap:x']), plugin('b', ['cap:x'])]),
		).toThrow(/Capability conflict/);
	});
});
