import { describe, expect, it } from 'vitest';

import { IndirectionLayer } from '../indirection-layer.js';

describe('IndirectionLayer', () => {
	it('allocates sequential physical indices initially', () => {
		const layer = new IndirectionLayer();
		expect(layer.pushPhysical()).toBe(0);
		expect(layer.pushPhysical()).toBe(1);
		expect(layer.pushPhysical()).toBe(2);
	});

	it('reuses freed indices from the free list', () => {
		const layer = new IndirectionLayer();
		layer.pushPhysical(); // 0
		layer.pushPhysical(); // 1
		layer.pushPhysical(); // 2

		const removed = layer.removeAt(1);
		expect(removed).toBe(1);

		// Next allocation should reuse the freed slot.
		expect(layer.pushPhysical()).toBe(1);
	});

	it('supports constructor initialLength and continues counter from there', () => {
		const layer = new IndirectionLayer(3);
		// existing mapping uses [0,1,2] so next should be 3
		expect(layer.pushPhysical()).toBe(3);
	});
});
