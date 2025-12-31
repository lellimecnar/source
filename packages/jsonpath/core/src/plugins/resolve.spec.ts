import { describe, expect, it } from 'vitest';

import { resolvePlugins } from './resolve';

function plugin(id: string, caps: string[] = [], deps: string[] = []) {
	return {
		meta: { id, capabilities: caps, dependsOn: deps },
	};
}

describe('resolvePlugins', () => {
	it('orders deterministically by plugin id', () => {
		const result = resolvePlugins([plugin('b'), plugin('a')]);
		expect(result.ordered.map((p) => p.meta.id)).toEqual(['a', 'b']);
	});

	it('throws when required dependencies are missing', () => {
		expect(() => resolvePlugins([plugin('a', [], ['missing'])])).toThrow(
			/Missing required plugin dependency/,
		);
	});

	it('throws on capability conflicts', () => {
		expect(() =>
			resolvePlugins([plugin('a', ['cap:x']), plugin('b', ['cap:x'])]),
		).toThrow(/Capability conflict/);
	});
});
