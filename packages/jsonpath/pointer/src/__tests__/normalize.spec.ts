import { describe, it, expect } from 'vitest';

import { normalize } from '../normalize.js';
import { JSONPointer } from '../pointer.js';

describe('normalize', () => {
	it('canonicalizes token encoding (~ and /)', () => {
		const tokens = ['a~b/c'];
		expect(normalize(tokens)).toBe('/a~0b~1c');
		expect(normalize('/a~0b~1c')).toBe('/a~0b~1c');
		expect(normalize(new JSONPointer('/a~0b~1c'))).toBe('/a~0b~1c');
	});

	it('preserves empty pointer', () => {
		expect(normalize('')).toBe('');
	});
});
