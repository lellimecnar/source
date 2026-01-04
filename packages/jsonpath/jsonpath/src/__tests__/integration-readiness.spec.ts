import { describe, it, expect } from 'vitest';
import {
	query,
	transform,
	JSONPointer,
	RelativeJSONPointer,
	applyPatch,
	applyMergePatch,
	createMergePatch,
} from '../index.js';

describe('JSONPath Integration Readiness', () => {
	const data = {
		users: [
			{
				id: 1,
				name: 'Alice',
				profile: { age: 30, city: 'New York' },
				tags: ['admin', 'editor'],
			},
			{
				id: 2,
				name: 'Bob',
				profile: { age: 25, city: 'London' },
				tags: ['user'],
			},
			{
				id: 3,
				name: 'Charlie',
				profile: { age: 35, city: 'Paris' },
				tags: ['user', 'editor'],
			},
		],
		config: {
			version: '1.0.0',
			features: {
				logging: true,
				analytics: false,
			},
		},
	};

	it('should support a complex integration workflow', () => {
		// 1. Use new built-in functions in a filter
		// Find users where the number of tags is greater than 1
		const multiTagUsers = query(data, '$.users[?length(@.tags) > 1]');
		expect(multiTagUsers.length).toBe(2); // Alice and Charlie
		expect(multiTagUsers.values().map((u) => u.name)).toEqual([
			'Alice',
			'Charlie',
		]);

		// 2. Use returned JSONPointer objects
		const alicePointer = multiTagUsers.pointers()[0];
		expect(alicePointer.toString()).toBe('/users/0');
		expect(alicePointer.resolve(data).name).toBe('Alice');

		// 3. Use Relative JSON Pointer
		// From Alice's profile, get her name (up 1 level, then 'name')
		const aliceProfilePointer = new JSONPointer('/users/0/profile');
		const relName = new RelativeJSONPointer('1/name');
		expect(relName.resolve(data, aliceProfilePointer)).toBe('Alice');

		// 4. Use JSON Patch (mutation-by-default)
		const patch = [
			{ op: 'replace', path: '/users/1/name', value: 'Robert' },
			{ op: 'add', path: '/users/1/profile/country', value: 'UK' },
		];
		const patchResult = applyPatch(data, patch);
		expect(data.users[1].name).toBe('Robert');
		expect((data.users[1].profile as any).country).toBe('UK');

		// 5. Use JSON Merge Patch (partial update)
		const configPatch = {
			version: '1.1.0',
			features: {
				analytics: true,
			},
		};
		applyMergePatch(data.config, configPatch);
		expect(data.config.version).toBe('1.1.0');
		expect(data.config.features.analytics).toBe(true);
		expect(data.config.features.logging).toBe(true); // Preserved because it's not in the patch

		// 6. Use transform with new pointers
		// Increment all ages by 1
		transform(data, '$.users[*].profile.age', (age) => age + 1);
		expect(data.users[0].profile.age).toBe(31);
		expect(data.users[1].profile.age).toBe(26);
		expect(data.users[2].profile.age).toBe(36);
	});
});
