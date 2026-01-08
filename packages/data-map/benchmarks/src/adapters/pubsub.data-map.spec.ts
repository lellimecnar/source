import { describe, expect, it } from 'vitest';

import { dataMapPubSubAdapter } from './pubsub.data-map.js';

describe('pubsub.data-map adapter', () => {
	it('smokeTest passes', () => {
		expect(dataMapPubSubAdapter.smokeTest()).toBe(true);
	});
});
