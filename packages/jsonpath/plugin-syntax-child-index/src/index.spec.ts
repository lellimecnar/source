import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-syntax-child-index', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-syntax-child-index');
		expect(plugin.meta.capabilities).toEqual([
			'syntax:rfc9535:child-index',
			'syntax:rfc9535:slice',
		]);
	});
});
