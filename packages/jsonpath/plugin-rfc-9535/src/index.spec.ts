import { describe, expect, it } from 'vitest';

import { createRfc9535Engine, plugin, rfc9535Plugins } from './index';

describe('@jsonpath/plugin-rfc-9535', () => {
	it('exports a preset list', () => {
		expect(rfc9535Plugins.length).toBeGreaterThan(5);
	});

	it('creates an engine', () => {
		const engine = createRfc9535Engine();
		const compiled = engine.compile('$.x');
		expect(compiled.expression).toBe('$.x');
	});

	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-rfc-9535');
	});
});
