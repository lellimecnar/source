import { describe, expect, it } from 'vitest';

import { setByPointer } from '@jsonpath/pointer';

describe('security regression: pointer hardening', () => {
	it('rejects prototype-pollution segments', () => {
		expect(() => setByPointer({}, '/__proto__/x', 1)).toThrow();
		expect(() => setByPointer({}, '/constructor/x', 1)).toThrow();
		expect(() => setByPointer({}, '/prototype/x', 1)).toThrow();
	});
});
