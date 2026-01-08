import { describe, expect, it } from 'vitest';

import { preactSignalsAdapter } from './signals.preact.js';

describe('signals.preact adapter', () => {
	it('smokeTest passes', () => {
		expect(preactSignalsAdapter.smokeTest()).toBe(true);
	});
});
