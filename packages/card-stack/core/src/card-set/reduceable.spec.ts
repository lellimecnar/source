import { Card, CardSet, isReduceable, Mix, Reduceable, toHex } from '..';

describe('reduceable', () => {
	class TestCard extends Mix(Card) {}
	class TestReduceable extends Mix(CardSet<TestCard>, Reduceable<TestCard>) {}

	const createReduceable = () => {
		const card1 = new TestCard();
		const card2 = new TestCard();
		const card3 = new TestCard();
		const card4 = new TestCard();
		const card5 = new TestCard();
		const card6 = new TestCard();
		const cardSet = new TestReduceable([
			card1,
			card2,
			card3,
			card4,
			card5,
			card6,
		]);

		return { card1, card2, card3, card4, card5, card6, cardSet };
	};

	it('is Reduceable', () => {
		const cardSet = new TestReduceable();
		expect(isReduceable(cardSet)).toBe(true);
	});

	describe('reduce', () => {
		it('reduces cards', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createReduceable();
			const reduced = cardSet.reduce(
				(result, card, i) => {
					result[toHex(card.id)!] = i;
					return result;
				},
				{} as Record<string, number>,
			);
			expect(reduced).toStrictEqual({
				[toHex(card1.id)!]: 0,
				[toHex(card2.id)!]: 1,
				[toHex(card3.id)!]: 2,
				[toHex(card4.id)!]: 3,
				[toHex(card5.id)!]: 4,
				[toHex(card6.id)!]: 5,
			});
		});
	});

	describe('reduceRight', () => {
		it('reduces cards in reverse', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createReduceable();
			const reduced = cardSet.reduceRight(
				(result, card, i, cards) => {
					result[toHex(card.id)!] = cards.length - i - 1;
					return result;
				},
				{} as Record<string, number>,
			);
			expect(reduced).toStrictEqual({
				[toHex(card6.id)!]: 0,
				[toHex(card5.id)!]: 1,
				[toHex(card4.id)!]: 2,
				[toHex(card3.id)!]: 3,
				[toHex(card2.id)!]: 4,
				[toHex(card1.id)!]: 5,
			});
		});
	});
});
