import { Mix, Parentable, isParentable } from '..';

describe('parentable', () => {
	class TestParentable extends Mix(Parentable<any>) {}

	it('is Parentable', () => {
		const parentable = new TestParentable();
		expect(isParentable(parentable)).toBe(true);
	});

	describe('hasAncestor', () => {
		it('returns true if the parent is the ancestor', () => {
			const parent = new TestParentable();
			const parentable = new TestParentable();
			parentable.parent = parent;
			expect(parentable.hasAncestor(parent)).toBe(true);

			const parent2 = new TestParentable();
			const parent3 = new TestParentable();

			parent.parent = parent2;
			parent2.parent = parent3;
			expect(parentable.hasAncestor(parent3)).toBe(true);
		});
	});
});
