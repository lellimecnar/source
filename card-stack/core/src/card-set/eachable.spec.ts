import { Card, CardSet, Eachable, isEachable, Mix } from '..';

describe('eachable', () => {
	class TestCard extends Mix(Card) {}
	class TestEachable extends Mix(CardSet<TestCard>, Eachable<TestCard>) {}

	it('is Eachable', () => {
		const cardSet = new TestEachable();
		expect(isEachable(cardSet)).toBe(true);
	});

	describe('each', () => {
		it('iterates over the cards', () => {
			const card1 = new TestCard();
			const card2 = new TestCard();
			const card3 = new TestCard();
			const cardSet = new TestEachable([card1, card2, card3]);
			const result: number[] = [];

			cardSet.each((card) => {
				result.push(card.id);
			});

			expect(result).toStrictEqual([card1.id, card2.id, card3.id]);
		});
	});

	describe('eachRight', () => {
		it('iterates over the cards', () => {
			const card1 = new TestCard();
			const card2 = new TestCard();
			const card3 = new TestCard();
			const cardSet = new TestEachable([card1, card2, card3]);
			const result: number[] = [];

			cardSet.eachRight((card) => {
				result.push(card.id);
			});

			expect(result).toStrictEqual([card3.id, card2.id, card1.id]);
		});
	});
});
