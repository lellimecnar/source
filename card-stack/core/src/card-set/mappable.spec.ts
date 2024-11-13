import { Card, CardSet, isMappable, Mappable, Mix } from '..';

describe('mappable', () => {
	class TestCard extends Mix(Card) {}
	class TestMappable extends Mix(CardSet<TestCard>, Mappable<TestCard>) {}

	const createMappable = () => {
		const card1 = new TestCard();
		const card2 = new TestCard();
		const card3 = new TestCard();
		const card4 = new TestCard();
		const card5 = new TestCard();
		const card6 = new TestCard();
		const cardSet = new TestMappable([
			card1,
			card2,
			card3,
			card4,
			card5,
			card6,
		]);

		return { card1, card2, card3, card4, card5, card6, cardSet };
	};

	it('is Mappable', () => {
		const cardSet = new TestMappable();
		expect(isMappable(cardSet)).toBe(true);
	});

	describe('map', () => {
		it('maps cards', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createMappable();
			const mapped = cardSet.map((card) => card.id);
			expect(mapped).toStrictEqual([
				card1.id,
				card2.id,
				card3.id,
				card4.id,
				card5.id,
				card6.id,
			]);
		});
	});

	describe('mapRight', () => {
		it('maps cards in reverse', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createMappable();
			const mapped = cardSet.mapRight((card) => card.id);
			expect(mapped).toStrictEqual([
				card6.id,
				card5.id,
				card4.id,
				card3.id,
				card2.id,
				card1.id,
			]);
		});
	});
});
