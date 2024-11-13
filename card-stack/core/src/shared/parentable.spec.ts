import { Mix, Parentable, isParentable } from '..';

describe('parentable', () => {
	class TestParentable extends Mix(Parentable<TestParentable>) {
		constructor(parent?: TestParentable) {
			super();
			this.parent = parent;
		}
	}

	it('is Parentable', () => {
		const parentable = new TestParentable();
		expect(isParentable(parentable)).toBe(true);
	});

	describe('hasAncestor', () => {
		it('returns true if the obj is an ancestor', () => {
			const parent1 = new TestParentable();
			const parent2 = new TestParentable(parent1);
			expect(parent2.hasAncestor(parent1)).toBe(true);

			const parent3 = new TestParentable(parent2);
			const parent4 = new TestParentable(parent3);

			expect(parent4.hasAncestor(parent1)).toBe(true);
			expect(parent4.hasAncestor(parent2)).toBe(true);
			expect(parent4.hasAncestor(parent3)).toBe(true);
			expect(parent3.hasAncestor(parent2)).toBe(true);
			expect(parent3.hasAncestor(parent1)).toBe(true);

			expect(parent3.hasAncestor(parent4)).toBe(false);
			expect(parent2.hasAncestor(parent4)).toBe(false);
			expect(parent2.hasAncestor(parent3)).toBe(false);
			expect(parent1.hasAncestor(parent3)).toBe(false);
			expect(parent1.hasAncestor(parent2)).toBe(false);
		});
	});
});
