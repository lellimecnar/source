import { describe, expect, it } from 'vitest';

import { dataMapStateAdapter } from './state.data-map.js';

describe('state.data-map adapter', () => {
	it('smokeTest passes', () => {
		expect(dataMapStateAdapter.smokeTest()).toBe(true);
	});
});
