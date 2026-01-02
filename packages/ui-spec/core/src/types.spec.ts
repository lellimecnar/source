import { describe, expect, it } from 'vitest';

import { isCallBinding, isPathBinding } from './types';

describe('bindings', () => {
	it('detects $path binding', () => {
		expect(isPathBinding({ $path: '$.a' })).toBe(true);
		expect(isPathBinding({ $path: 1 })).toBe(false);
		expect(isPathBinding(null)).toBe(false);
	});

	it('detects $call binding', () => {
		expect(isCallBinding({ $call: { id: 'fn' } })).toBe(true);
		expect(isCallBinding({ $call: { id: 123 } })).toBe(false);
		expect(isCallBinding({ $call: null })).toBe(false);
	});
});
