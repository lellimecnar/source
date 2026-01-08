import { describe, expect, it } from 'vitest';

import { dotPropPathAdapter } from './path.dot-prop.js';

describe('path.dot-prop adapter', () => {
	it('smokeTest passes', () => {
		expect(dotPropPathAdapter.smokeTest()).toBe(true);
	});
});
