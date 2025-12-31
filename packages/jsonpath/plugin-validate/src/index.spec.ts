import { describe, expect, it } from 'vitest';

import { plugin, validateAll, type ValidatorAdapter } from './index';

describe('@jsonpath/plugin-validate', () => {
	it('validates multiple values', () => {
		const adapter: ValidatorAdapter = {
			id: 'test',
			validate: (v) => (v === 1 ? [{ message: 'bad', code: 'E_BAD' }] : []),
		};
		expect(validateAll([0, 1, 2], adapter)).toEqual([
			{ message: 'bad', code: 'E_BAD' },
		]);
	});

	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-validate');
	});
});
