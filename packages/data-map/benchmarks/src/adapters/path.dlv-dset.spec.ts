import { describe, expect, it } from 'vitest';

import { dlvDsetPathAdapter } from './path.dlv-dset.js';

describe('path.dlv-dset adapter', () => {
	it('smokeTest passes', () => {
		expect(dlvDsetPathAdapter.smokeTest()).toBe(true);
	});
});
