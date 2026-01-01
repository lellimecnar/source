import { describe, expect, it } from 'vitest';

import { createCompleteEngine, completePlugins, rfc9535Plugins } from './index';

describe('@jsonpath/complete', () => {
	it('re-exports RFC 9535 preset', () => {
		expect(rfc9535Plugins.length).toBeGreaterThan(5);
	});

	it('provides complete engine', () => {
		expect(completePlugins.length).toBeGreaterThan(rfc9535Plugins.length);
		const engine = createCompleteEngine();
		expect(engine.compile('$.x').expression).toBe('$.x');
	});
});
