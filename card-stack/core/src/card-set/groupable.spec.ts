import {
	Card,
	CardSet,
	createRankEnum,
	createSuitEnum,
	Groupable,
	isGroupable,
	Mix,
	Rankable,
	Suitable,
} from '..';

describe('groupable', () => {
	class TestCard extends Mix(Card, Rankable, Suitable) {
		static RANK = createRankEnum(['ACE', 'TWO', 'THREE']);
		static SUIT = createSuitEnum(['HEARTS', 'DIAMONDS']);
	}
	class TestGroupable extends Mix(CardSet<TestCard>, Groupable<TestCard>) {}

	const createGroupable = () => {
		const card1 = new TestCard(TestCard.SUIT.HEARTS, TestCard.RANK.ACE);
		const card2 = new TestCard(TestCard.SUIT.HEARTS, TestCard.RANK.TWO);
		const card3 = new TestCard(TestCard.SUIT.HEARTS, TestCard.RANK.THREE);
		const card4 = new TestCard(TestCard.SUIT.DIAMONDS, TestCard.RANK.ACE);
		const card5 = new TestCard(TestCard.SUIT.DIAMONDS, TestCard.RANK.TWO);
		const card6 = new TestCard(TestCard.SUIT.DIAMONDS, TestCard.RANK.THREE);
		const cardSet = new TestGroupable([
			card1,
			card2,
			card3,
			card4,
			card5,
			card6,
		]);

		return { card1, card2, card3, card4, card5, card6, cardSet };
	};

	it('is Groupable', () => {
		const cardSet = new TestGroupable();
		expect(isGroupable(cardSet)).toBe(true);
	});

	describe('groupBy', () => {
		it('groups cards by rank with function', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createGroupable();
			const groups = cardSet.groupBy((card) => card.rank);
			expect(groups).toStrictEqual({
				[TestCard.RANK.ACE]: [card1, card4],
				[TestCard.RANK.TWO]: [card2, card5],
				[TestCard.RANK.THREE]: [card3, card6],
			});
		});

		it('groups cards by rank with key', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createGroupable();
			const groups = cardSet.groupBy('rank');
			expect(groups).toStrictEqual({
				[TestCard.RANK.ACE]: [card1, card4],
				[TestCard.RANK.TWO]: [card2, card5],
				[TestCard.RANK.THREE]: [card3, card6],
			});
		});
	});
});
