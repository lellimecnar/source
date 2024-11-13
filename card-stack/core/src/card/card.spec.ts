import { Card, CardSet, isIndexable, isParentable, Mix } from '..';

describe('card', () => {
	class TestCard extends Mix(Card) {
		static __reset(): void {
			this.instances.clear();
		}
	}

	beforeEach(() => {
		TestCard.__reset();
	});

	afterEach(() => {
		TestCard.__reset();
	});

	it('is Indexable', () => {
		const card = new TestCard();
		expect(isIndexable(card)).toBe(true);
	});

	it('is Parentable', () => {
		const card = new TestCard();
		expect(isParentable(card)).toBe(true);
	});

	it('takes parent', () => {
		class TestCardSet extends Mix(CardSet) {}

		const cardSet = new TestCardSet();
		const card = new TestCard(cardSet);
		expect(card.parent).toBe(cardSet);
	});

	describe('.id', () => {
		it('contains index', () => {
			const card = new TestCard();
			const id = card.id;

			expect(card).toHaveProperty('id');
			expect(id).toBeDefined();
			expect(typeof id).toBe('number');
			expect(id).toBeGreaterThan(0);
			expect(id).toBe(card.index);
		});
	});

	describe('getCard', () => {
		it('takes an id', () => {
			const card = new TestCard();

			expect(TestCard.getCard(card.id)).toBe(card);
		});
	});
});
