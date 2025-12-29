import { Card, CardSet, isShuffleable, Mix, Shuffleable } from '..';

describe('shuffleable', () => {
	class TestCard extends Mix(Card) {}
	class TestShuffleable extends Mix(CardSet<TestCard>, Shuffleable<TestCard>) {}

	const createShuffleable = () => {
		const card1 = new TestCard();
		const card2 = new TestCard();
		const card3 = new TestCard();
		const card4 = new TestCard();
		const card5 = new TestCard();
		const card6 = new TestCard();
		const cardSet = new TestShuffleable([
			card1,
			card2,
			card3,
			card4,
			card5,
			card6,
		]);

		return { card1, card2, card3, card4, card5, card6, cardSet };
	};

	it('is Shuffleable', () => {
		const cardSet = new TestShuffleable();
		expect(isShuffleable(cardSet)).toBe(true);
	});

	describe('shuffle', () => {
		it('randomizes cards in-place', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createShuffleable();
			expect([...cardSet]).toStrictEqual([
				card1,
				card2,
				card3,
				card4,
				card5,
				card6,
			]);

			cardSet.shuffle();
			expect([...cardSet]).not.toStrictEqual([
				card1,
				card2,
				card3,
				card4,
				card5,
				card6,
			]);
		});
	});

	describe('toReversed', () => {
		it('returns new reversed array of cards', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createShuffleable();
			expect(cardSet.toShuffled()).not.toStrictEqual([
				card1,
				card2,
				card3,
				card4,
				card5,
				card6,
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
