import { describe, expect, it } from 'vitest';

import { objectPathAdapter } from './path.object-path.js';

describe('path.object-path adapter', () => {
	it('smokeTest passes', () => {
		expect(objectPathAdapter.smokeTest()).toBe(true);
	});
});
