import { describe, expect, it } from 'vitest';

import { parseConfig } from './config';

describe('@jsonpath/cli', () => {
	it('parses a minimal JSON config', () => {
		const cfg = parseConfig({ path: '$.a', json: { a: 1 } });
		expect(cfg.path).toBe('$.a');
		expect(cfg.json).toEqual({ a: 1 });
	});
});
