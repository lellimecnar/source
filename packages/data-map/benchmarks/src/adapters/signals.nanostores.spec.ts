import { describe, expect, it } from 'vitest';

import { nanostoresSignalsAdapter } from './signals.nanostores.js';

describe('signals.nanostores adapter', () => {
	it('smokeTest passes', () => {
		expect(nanostoresSignalsAdapter.smokeTest()).toBe(true);
	});
});
