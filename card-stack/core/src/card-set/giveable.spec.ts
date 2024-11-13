import { Card, CardSet, Giveable, isGiveable, Mix } from '..';

describe('giveable', () => {
	class TestCard extends Mix(Card) {
		static __reset() {
			this.instances.clear();
		}
	}
	class TestGiveable extends Mix(CardSet<TestCard>, Giveable<TestCard>) {}

	const makeGiveable = () => {
		TestCard.__reset();
		const card1 = new TestCard();
		const card2 = new TestCard();
		const card3 = new TestCard();
		const card4 = new TestCard();
		const card5 = new TestCard();
		const card6 = new TestCard();
		const cardSet = new TestGiveable([card1, card2, card3, card4]);

		return { card1, card2, card3, card4, card5, card6, cardSet };
	};

	it('is Giveable', () => {
		const cardSet = new TestGiveable();
		expect(isGiveable(cardSet)).toBe(true);
	});

	describe('give', () => {
		it('accepts a card', () => {
			const { card1, card2, card3, card4, card5, cardSet } = makeGiveable();
			cardSet.give(card5);
			expect([...cardSet]).toStrictEqual([card5, card1, card2, card3, card4]);
		});

		it('accepts an array of cards', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				makeGiveable();
			cardSet.give([card5, card6]);
			expect([...cardSet]).toStrictEqual([
				card5,
				card6,
				card1,
				card2,
				card3,
				card4,
			]);
		});

		it('accepts an index', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				makeGiveable();
			cardSet.give([card5, card6], 2);
			expect([...cardSet]).toStrictEqual([
				card1,
				card2,
				card5,
				card6,
				card3,
				card4,
			]);
		});
	});

	describe('giveRight', () => {
		it('accepts a card', () => {
			const { card1, card2, card3, card4, card5, cardSet } = makeGiveable();
			cardSet.giveRight(card5);
			expect([...cardSet]).toStrictEqual([card1, card2, card3, card4, card5]);
		});

		it('accepts an array of cards', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				makeGiveable();
			cardSet.giveRight([card5, card6]);
			expect([...cardSet]).toStrictEqual([
				card1,
				card2,
				card3,
				card4,
				card5,
				card6,
			]);
		});
		it('accepts an index', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				makeGiveable();
			cardSet.give([card5, card6], 2);
			expect([...cardSet]).toStrictEqual([
				card1,
				card2,
				card5,
				card6,
				card3,
				card4,
			]);
		});
	});
});
