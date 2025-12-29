import { Card, CardSet, isReversible, Mix, Reversible } from '..';

describe('reversible', () => {
	class TestCard extends Mix(Card) {}
	class TestReversible extends Mix(CardSet<TestCard>, Reversible<TestCard>) {}

	const createReversible = () => {
		const card1 = new TestCard();
		const card2 = new TestCard();
		const card3 = new TestCard();
		const card4 = new TestCard();
		const card5 = new TestCard();
		const card6 = new TestCard();
		const cardSet = new TestReversible([
			card1,
			card2,
			card3,
			card4,
			card5,
			card6,
		]);

		return { card1, card2, card3, card4, card5, card6, cardSet };
	};

	it('is Reversible', () => {
		const cardSet = new TestReversible();
		expect(isReversible(cardSet)).toBe(true);
	});

	describe('reverse', () => {
		it('reverses cards in-place', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createReversible();
			expect([...cardSet]).toStrictEqual([
				card1,
				card2,
				card3,
				card4,
				card5,
				card6,
			]);

			cardSet.reverse();
			expect([...cardSet]).toStrictEqual([
				card6,
				card5,
				card4,
				card3,
				card2,
				card1,
			]);
		});
	});

	describe('toReversed', () => {
		it('returns new reversed array of cards', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createReversible();

			expect(cardSet.toReversed()).toStrictEqual([
				card6,
				card5,
				card4,
				card3,
				card2,
				card1,
			]);

			expect([...cardSet]).toStrictEqual([
				card1,
				card2,
				card3,
				card4,
				card5,
				card6,
			]);
		});
	});
});
