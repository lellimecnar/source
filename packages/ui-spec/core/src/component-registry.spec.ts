import { describe, expect, it } from 'vitest';

import { ComponentRegistry } from './component-registry';

describe('ComponentRegistry', () => {
	it('registers and resolves components', () => {
		const reg = new ComponentRegistry<number>();
		reg.register('X', 1);
		expect(reg.require('X')).toBe(1);
	});
});
