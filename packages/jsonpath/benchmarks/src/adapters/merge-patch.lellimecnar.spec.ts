import { describe, expect, it } from 'vitest';
import { lellimecnarMergePatchAdapter } from './merge-patch.lellimecnar';

describe('merge-patch.lellimecnar', () => {
	it('should apply merge patch', () => {
		expect(lellimecnarMergePatchAdapter.smokeTest()).toBe(true);
	});
});
