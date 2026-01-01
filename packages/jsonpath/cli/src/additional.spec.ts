import { describe, expect, it } from 'vitest';

import { parseConfig } from './config';

describe('@jsonpath/cli (additional)', () => {
	it('rejects non-object configs', () => {
		expect(() => parseConfig(null)).toThrow(/object/);
		expect(() => parseConfig(123)).toThrow(/object/);
	});

	it('rejects missing path', () => {
		expect(() => parseConfig({ json: {} })).toThrow(/Config\.path/);
	});

	it('rejects non-string path', () => {
		expect(() => parseConfig({ path: 1, json: {} })).toThrow(/Config\.path/);
	});

	it('passes through resultType unvalidated (CLI is JSON-only, not schema-enforced)', () => {
		const cfg = parseConfig({ path: '$', json: {}, resultType: 'pointer' });
		expect(cfg.resultType).toBe('pointer');
	});

	it('allows any JSON value for json payload', () => {
		const cfg = parseConfig({ path: '$', json: [1, 2, 3] });
		expect(cfg.json).toEqual([1, 2, 3]);
	});
});
