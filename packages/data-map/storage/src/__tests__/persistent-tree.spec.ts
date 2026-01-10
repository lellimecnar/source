import { describe, expect, it } from 'vitest';
import { emptyNode, getPath, updatePath } from '../persistent-tree.js';

describe('persistent-tree', () => {
	it('shares unchanged branches', () => {
		const root = emptyNode<number>();
		const a = updatePath(root, ['users', '0', 'age'], 30);
		const b = updatePath(a, ['users', '0', 'name'], 1);

		expect(getPath(a, ['users', '0', 'age'])).toBe(30);
		expect(getPath(b, ['users', '0', 'age'])).toBe(30);

		// Structural sharing: the /users subtree should be shared except where modified.
		const aUsers = a.children.get('users');
		const bUsers = b.children.get('users');
		expect(aUsers).toBe(bUsers);
	});
});
