import { describe, expect, it } from 'vitest';

import { createJsonSchemaAdapter } from './index';

describe('@jsonpath/validator-json-schema', () => {
	it('returns issues for invalid values', () => {
		const adapter = createJsonSchemaAdapter({ type: 'number' });
		expect(adapter.validate('x').length).toBeGreaterThan(0);
		expect(adapter.validate(1)).toEqual([]);
	});
});
