import { describe, expect, it } from 'vitest';

import { vueSignalsAdapter } from './signals.vue.js';

describe('signals.vue adapter', () => {
	it('smokeTest passes', () => {
		expect(vueSignalsAdapter.smokeTest()).toBe(true);
	});
});
