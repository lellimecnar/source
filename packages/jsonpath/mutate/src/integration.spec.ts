import { describe, expect, it } from 'vitest';
import { createEngine } from '@jsonpath/core';
import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';
import { setAllByQuery, removeAllByQuery } from './index';

describe('@jsonpath/mutate integration', () => {
	const engine = createEngine({
		plugins: rfc9535Plugins,
	});

	it('sets values by JSONPath query', () => {
		const data = {
			items: [
				{ id: 1, active: false },
				{ id: 2, active: false },
				{ id: 3, active: true },
			],
		};

		// Set all inactive items to active: true
		const next = setAllByQuery(
			engine,
			data,
			'$.items[?(@.active == false)].active',
			true,
		) as any;

		expect(next.items[0].active).toBe(true);
		expect(next.items[1].active).toBe(true);
		expect(next.items[2].active).toBe(true);
		// Original should be untouched
		expect(data.items[0]!.active).toBe(false);
	});

	it('removes values by JSONPath query', () => {
		const data = {
			items: [
				{ id: 1, active: false },
				{ id: 2, active: false },
				{ id: 3, active: true },
			],
		};

		// Remove all inactive items
		const next = removeAllByQuery(
			engine,
			data,
			'$.items[?(@.active == false)]',
		) as any;

		expect(next.items).toHaveLength(1);
		expect(next.items[0].id).toBe(3);
	});
});
