import { describe, it, expect } from 'vitest';
import { builder } from '../builder.js';

describe('PatchBuilder', () => {
	it('should build a patch with multiple operations', () => {
		const patch = builder()
			.add('/a', 1)
			.replace('/b', 2)
			.remove('/c')
			.move('/d', '/e')
			.copy('/f', '/g')
			.test('/h', 3)
			.toOperations();

		expect(patch).toEqual([
			{ op: 'add', path: '/a', value: 1 },
			{ op: 'replace', path: '/b', value: 2 },
			{ op: 'remove', path: '/c' },
			{ op: 'move', from: '/d', path: '/e' },
			{ op: 'copy', from: '/f', path: '/g' },
			{ op: 'test', path: '/h', value: 3 },
		]);
	});

	it('should apply the built patch', () => {
		const target = { a: 1 };
		const result = builder().add('/b', 2).replace('/a', 3).apply(target);

		expect(result).toEqual({ a: 3, b: 2 });
	});
});
