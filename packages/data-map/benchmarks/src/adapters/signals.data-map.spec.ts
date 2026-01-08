import { describe, expect, it } from 'vitest';

import { dataMapSignalsAdapter } from './signals.data-map.js';

describe('signals.data-map adapter', () => {
	it('smokeTest passes', () => {
		expect(dataMapSignalsAdapter.smokeTest()).toBe(true);
	});
});
