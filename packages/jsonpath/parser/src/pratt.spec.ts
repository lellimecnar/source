import { describe, expect, it } from 'vitest';

import { PrattRegistry } from './pratt/types';

describe('@jsonpath/parser pratt', () => {
	it('registers operators', () => {
		const r = new PrattRegistry();
		r.register({ id: '==', precedence: 10 });
		expect(r.all()).toHaveLength(1);
	});
});
