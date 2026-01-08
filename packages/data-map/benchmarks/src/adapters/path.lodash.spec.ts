import { describe, expect, it } from 'vitest';

import { lodashPathAdapter } from './path.lodash.js';

describe('path.lodash adapter', () => {
	it('smokeTest passes', () => {
		expect(lodashPathAdapter.smokeTest()).toBe(true);
	});
});
