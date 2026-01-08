import { describe, expect, it } from 'vitest';

import { maverickSignalsAdapter } from './signals.maverick.js';

describe('signals.maverick adapter', () => {
	it('smokeTest passes', () => {
		expect(maverickSignalsAdapter.smokeTest()).toBe(true);
	});
});
