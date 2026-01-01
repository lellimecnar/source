import { describe, expect, it } from 'vitest';

import { createRfc9535Engine, plugin, rfc9535Plugins } from './index';

describe('@jsonpath/plugin-rfc-9535 (additional)', () => {
	it('exports stable plugin metadata and dependsOn', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-rfc-9535');
		expect(plugin.meta.capabilities).toContain('preset:rfc9535');
		expect(plugin.meta.dependsOn).toEqual(rfc9535Plugins.map((p) => p.meta.id));
	});

	it('contains the syntax-root plugin id in the preset list', () => {
		expect(rfc9535Plugins.map((p) => p.meta.id)).toContain(
			'@jsonpath/plugin-syntax-root',
		);
	});

	it('creates an engine that can evaluate a simple query', () => {
		const engine = createRfc9535Engine();
		const compiled = engine.compile('$.x');
		expect(engine.evaluateSync(compiled, { x: 123 })).toEqual([123]);
	});

	it('respects rfc9535-core profile (filters rejected)', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		expect(() => engine.compile('$[?(@.a)]')).toThrow(
			/Filter selectors are not supported in rfc9535-core/i,
		);
	});

	it('respects rfc9535-full profile (functions allowed)', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
		expect(() => engine.compile('$[?length(@.a) == 1]')).not.toThrow();
	});
});
