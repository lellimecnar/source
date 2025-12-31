import { describe, expect, it } from 'vitest';

import { createRfc9535Engine, rfc9535Plugins } from './index';

describe('@jsonpath/complete', () => {
	it('re-exports RFC 9535 preset', () => {
		expect(rfc9535Plugins.length).toBeGreaterThan(5);
		const engine = createRfc9535Engine();
		expect(engine.compile('$.x').expression).toBe('$.x');
	});
});
