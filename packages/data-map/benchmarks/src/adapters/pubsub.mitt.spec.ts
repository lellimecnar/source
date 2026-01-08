import { describe, expect, it } from 'vitest';

import { mittPubSubAdapter } from './pubsub.mitt.js';

describe('pubsub.mitt adapter', () => {
	it('smokeTest passes', () => {
		expect(mittPubSubAdapter.smokeTest()).toBe(true);
	});
});
