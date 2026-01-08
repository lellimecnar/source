import { describe, expect, it } from 'vitest';

import { solidSignalsAdapter } from './signals.solid.js';

describe('signals.solid adapter', () => {
	it('smokeTest passes', () => {
		expect(solidSignalsAdapter.smokeTest()).toBe(true);
	});
});
