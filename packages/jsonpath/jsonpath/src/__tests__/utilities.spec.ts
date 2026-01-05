import { describe, it, expect } from 'vitest';
import {
	secureQuery,
	transformAll,
	projectWith,
	merge,
	mergeWith,
} from '../index.js';

describe('JSONPath Utilities', () => {
	const data = {
		users: [
			{ id: 1, name: 'Alice', age: 30 },
			{ id: 2, name: 'Bob', age: 25 },
		],
	};

	describe('secureQuery', () => {
		it('should enforce maxQueryLength', () => {
			expect(() =>
				secureQuery(data, '$.users[*].name', {
					secure: { maxQueryLength: 5 },
				}),
			).toThrow(/Query length exceeds maximum/);
		});

		it('should block recursive descent by default', () => {
			expect(() => secureQuery(data, '$..name')).toThrow(
				/Recursive descent is disabled/,
			);
		});
	});

	describe('transformAll', () => {
		it('should apply multiple transformations', () => {
			const result = transformAll(data, [
				{ path: '$.users[0].age', fn: (age) => age + 1 },
				{ path: '$.users[1].age', fn: (age) => age + 5 },
			]);
			expect(result.users[0].age).toBe(31);
			expect(result.users[1].age).toBe(30);
		});
	});

	describe('projectWith', () => {
		it('should project with paths and functions', () => {
			const result = projectWith(data, {
				firstUserName: '$.users[0].name',
				userCount: (root) => root.users.length,
				allNames: '$.users[*].name',
			});
			expect(result).toEqual({
				firstUserName: 'Alice',
				userCount: 2,
				allNames: ['Alice', 'Bob'],
			});
		});
	});

	describe('merge and mergeWith', () => {
		it('should merge patches', () => {
			const result = merge(data, {
				users: { '0': { age: 31 } },
			});
			expect(result.users[0].age).toBe(31);
		});

		it('should merge multiple patches', () => {
			const result = mergeWith(
				data,
				{ users: { '0': { age: 31 } } },
				{ users: { '1': { age: 26 } } },
			);
			expect(result.users[0].age).toBe(31);
			expect(result.users[1].age).toBe(26);
		});
	});
});
