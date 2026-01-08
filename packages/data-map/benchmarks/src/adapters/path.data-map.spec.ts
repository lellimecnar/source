import { describe, expect, it } from 'vitest';

import { dataMapPathAdapter } from './path.data-map.js';

describe('path.data-map adapter', () => {
	it('smokeTest passes', () => {
		expect(dataMapPathAdapter.smokeTest()).toBe(true);
	});
});
