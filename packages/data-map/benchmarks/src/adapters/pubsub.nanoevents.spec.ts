import { describe, expect, it } from 'vitest';

import { nanoeventsPubSubAdapter } from './pubsub.nanoevents.js';

describe('pubsub.nanoevents adapter', () => {
	it('smokeTest passes', () => {
		expect(nanoeventsPubSubAdapter.smokeTest()).toBe(true);
	});
});
