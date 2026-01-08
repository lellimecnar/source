import { describe, expect, it } from 'vitest';

import {
	benchKey,
	dotPathToPointer,
	ensureNonEmptyString,
} from './adapter-helpers.js';

describe('adapter-helpers', () => {
	it('benchKey formats stable names', () => {
		expect(
			benchKey({
				category: 'signals',
				caseName: 'write',
				adapterName: 'data-map',
			}),
		).toBe('signals.write.data-map');
	});

	it('ensureNonEmptyString throws on empty', () => {
		expect(() => ensureNonEmptyString('', 'x')).toThrow(/non-empty/);
	});

	it('dotPathToPointer supports dot + brackets', () => {
		expect(dotPathToPointer('a.b.c')).toBe('/a/b/c');
		expect(dotPathToPointer('a[0].b')).toBe('/a/0/b');
		expect(dotPathToPointer('a[0][1]')).toBe('/a/0/1');
	});

	it('dotPathToPointer returns pointers as-is', () => {
		expect(dotPathToPointer('/a/b/0')).toBe('/a/b/0');
	});
});
