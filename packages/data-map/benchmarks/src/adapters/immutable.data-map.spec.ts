import { describe, expect, it } from 'vitest';

import { dataMapImmutableAdapter } from './immutable.data-map.js';

describe('immutable.data-map adapter', () => {
	it('smokeTest passes', () => {
		expect(dataMapImmutableAdapter.smokeTest()).toBe(true);
	});
});
