import {
	Card,
	CardSet,
	createRankEnum,
	createSuitEnum,
	Hasable,
	isHasable,
	Mix,
	Rankable,
	Suitable,
} from '..';

describe('hasable', () => {
	class TestCard extends Mix(Card, Rankable, Suitable) {
		static RANK = createRankEnum(['ACE', 'TWO', 'THREE']);
		static SUIT = createSuitEnum(['HEARTS', 'DIAMONDS']);
	}
	class TestHasable extends Mix(CardSet<TestCard>, Hasable<TestCard>) {}

	const createHasable = () => {
		const card1 = new TestCard(TestCard.SUIT.HEARTS, TestCard.RANK.ACE);
		const card2 = new TestCard(TestCard.SUIT.HEARTS, TestCard.RANK.TWO);
		const card3 = new TestCard(TestCard.SUIT.HEARTS, TestCard.RANK.THREE);
		const card4 = new TestCard(TestCard.SUIT.DIAMONDS, TestCard.RANK.ACE);
		const card5 = new TestCard(TestCard.SUIT.DIAMONDS, TestCard.RANK.TWO);
		const card6 = new TestCard(TestCard.SUIT.DIAMONDS, TestCard.RANK.THREE);
		const cardSet = new TestHasable([card1, card2, card3]);

		return { card1, card2, card3, card4, card5, card6, cardSet };
	};

	it('is Hasable', () => {
		const cardSet = new TestHasable();
		expect(isHasable(cardSet)).toBe(true);
	});

	describe('has', () => {
		it('accepts an index', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createHasable();
			expect(cardSet.has(card1.id)).toBe(true);
			expect(cardSet.has(card2.id)).toBe(true);
			expect(cardSet.has(card3.id)).toBe(true);
			expect(cardSet.has(card4.id)).toBe(false);
			expect(cardSet.has(card5.id)).toBe(false);
			expect(cardSet.has(card6.id)).toBe(false);
		});

		it('accepts a card', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createHasable();
			expect(cardSet.has(card1)).toBe(true);
			expect(cardSet.has(card2)).toBe(true);
			expect(cardSet.has(card3)).toBe(true);
			expect(cardSet.has(card4)).toBe(false);
			expect(cardSet.has(card5)).toBe(false);
			expect(cardSet.has(card6)).toBe(false);
		});
	});

	describe('hasAny', () => {
		it('accepts indexes or cards', () => {
			const { card1, card2, card4, card5, card6, cardSet } = createHasable();
			expect(cardSet.hasAny(card1.id, card4, card2, card5.id)).toBe(true);
			expect(cardSet.hasAny(card4, card4.id, card5, card6.id)).toBe(false);
		});
	});

	describe('hasAll', () => {
		it('accepts indexes or cards', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createHasable();
			expect(cardSet.hasAll(card1.id, card3, card2, card2.id)).toBe(true);
			expect(cardSet.hasAll(card2.id, card4, card4.id, card5, card6.id)).toBe(
				false,
			);
		});
	});
});
