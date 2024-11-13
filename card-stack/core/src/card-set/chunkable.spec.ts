import { Card, CardSet, Chunkable, isChunkable, Mix } from '..';

describe('chunkable', () => {
	class TestCard extends Mix(Card) {}
	class TestChunkable extends Mix(CardSet<TestCard>, Chunkable) {}

	it('is Chunkable', () => {
		const chunkable = new TestChunkable();
		expect(isChunkable(chunkable)).toBe(true);
	});

	describe('chunk', () => {
		it('returns an array of arrays', () => {
			const card1 = new TestCard();
			const card2 = new TestCard();
			const card3 = new TestCard();
			const card4 = new TestCard();
			const card5 = new TestCard();
			const card6 = new TestCard();

			const cardSet = new TestChunkable([
				card1,
				card2,
				card3,
				card4,
				card5,
				card6,
			]);

			expect(cardSet.chunk(2)).toStrictEqual([
				[card1, card2],
				[card3, card4],
				[card5, card6],
			]);
			expect(cardSet.chunk(3)).toStrictEqual([
				[card1, card2, card3],
				[card4, card5, card6],
			]);
			expect(cardSet.chunk(4)).toStrictEqual([
				[card1, card2, card3, card4],
				[card5, card6],
			]);
		});
	});
});
