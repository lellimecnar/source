import { describe, expect, it } from 'vitest';
import { createEngine } from '@jsonpath/core';
import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';

import {
	plugin,
	validateAll,
	validateQuerySync,
	type ValidatorAdapter,
} from './index';

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

	it('validates by query', () => {
		const engine = createEngine({ plugins: rfc9535Plugins });
		const data = {
			items: [
				{ id: 1, val: 'ok' },
				{ id: 2, val: 'bad' },
			],
		};
		const adapter: ValidatorAdapter = {
			id: 'test',
			validate: (v: any) =>
				v?.val === 'bad' ? [{ message: 'invalid value' }] : [],
		};

		const result = validateQuerySync(engine, data, '$.items[*]', adapter);
		expect(result.ok).toBe(false);
		expect(result.items).toHaveLength(2);
		expect(result.items[0]!.issues).toHaveLength(0);
		expect(result.items[1]!.issues).toHaveLength(1);
		expect(result.items[1]!.pointer).toBe('/items/1');
		expect(result.items[1]!.path).toBe('$.items[1]');
	});

	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-validate');
	});
});
