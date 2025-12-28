import { readJsonPath } from './bindings/jsonpath';

describe('readJsonPath', () => {
	it('returns undefined when no matches', () => {
		expect(readJsonPath({ a: 1 }, '$.missing')).toBeUndefined();
	});

	it('returns a single value when one match', () => {
		expect(readJsonPath({ a: 1 }, '$.a')).toBe(1);
	});

	it('returns an array when multiple matches', () => {
		const data = {
			users: [
				{ active: true, name: 'A' },
				{ active: true, name: 'B' },
			],
		};
		expect(readJsonPath(data, '$.users[?(@.active)].name')).toEqual(['A', 'B']);
	});
});
