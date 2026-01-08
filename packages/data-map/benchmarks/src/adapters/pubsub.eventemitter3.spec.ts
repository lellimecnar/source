import { describe, expect, it } from 'vitest';

import { eventemitter3PubSubAdapter } from './pubsub.eventemitter3.js';

describe('pubsub.eventemitter3 adapter', () => {
	it('smokeTest passes', () => {
		expect(eventemitter3PubSubAdapter.smokeTest()).toBe(true);
	});
});
