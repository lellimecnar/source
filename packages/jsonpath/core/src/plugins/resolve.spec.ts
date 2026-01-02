import { describe, expect, it } from 'vitest';

import { resolvePlugins } from './resolve';
import { PluginPhases, type PluginPhase } from './phases';

function plugin(
	id: string,
	caps: string[] = [],
	deps: string[] = [],
	optionalDeps: string[] = [],
	phases: readonly PluginPhase[] = [PluginPhases.runtime],
	order?: any,
) {
	return {
		meta: {
			id,
			capabilities: caps,
			dependsOn: deps,
			optionalDependsOn: optionalDeps,
			phases,
			order,
		},
		setup: () => {},
	};
}

describe('resolvePlugins', () => {
	it('orders deterministically by plugin id within same phase', () => {
		const result = resolvePlugins([plugin('b'), plugin('a')]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual(['a', 'b']);
	});

	it('orders by phase: syntax -> filter -> runtime -> result', () => {
		const p1 = plugin('res', [], [], [], [PluginPhases.result]);
		const p2 = plugin('syn', [], [], [], [PluginPhases.syntax]);
		const p3 = plugin('run', [], [], [], [PluginPhases.runtime]);
		const p4 = plugin('fil', [], [], [], [PluginPhases.filter]);

		const result = resolvePlugins([p1, p2, p3, p4]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual([
			'syn',
			'fil',
			'run',
			'res',
		]);
	});

	it('orders dependencies before dependents within same phase', () => {
		// Id ordering alone would produce a, c; but deps require c before a.
		const result = resolvePlugins([plugin('a', [], ['c']), plugin('c')]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual(['c', 'a']);
	});

	it('respects order.first and order.last', () => {
		const p1 = plugin('a');
		const p2 = plugin('b', [], [], [], [PluginPhases.runtime], { first: true });
		const p3 = plugin('c', [], [], [], [PluginPhases.runtime], { last: true });

		const result = resolvePlugins([p1, p2, p3]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual(['b', 'a', 'c']);
	});

	it('respects order.before and order.after', () => {
		const p1 = plugin('a', [], [], [], [PluginPhases.runtime], {
			after: ['b'],
		});
		const p2 = plugin('b');
		const p3 = plugin('c', [], [], [], [PluginPhases.runtime], {
			before: ['b'],
		});

		const result = resolvePlugins([p1, p2, p3]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual(['c', 'b', 'a']);
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

	it('handles duplicate plugin ids by last-wins if allowMultiple is false', () => {
		const p1 = plugin('a');
		const p2 = { ...plugin('a'), version: 2 };
		const result = resolvePlugins([p1, p2]);
		expect(result.ordered.length).toBe(1);
		expect((result.ordered[0] as any).version).toBe(2);
	});

	it('falls back to stable ID ordering on unsatisfiable constraints', () => {
		const p1 = plugin('a', [], [], [], [PluginPhases.runtime], {
			after: ['b'],
		});
		const p2 = plugin('b', [], [], [], [PluginPhases.runtime], {
			after: ['a'],
		});

		const result = resolvePlugins([p1, p2]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual(['a', 'b']);
	});

	it('throws on capability conflicts', () => {
		expect(() =>
			resolvePlugins([plugin('a', ['cap:x']), plugin('b', ['cap:x'])]),
		).toThrow(/Capability conflict/);
	});
});
