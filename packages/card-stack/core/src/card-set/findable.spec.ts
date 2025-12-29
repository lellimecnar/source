import { Card, CardSet, Findable, isFindable, Mix } from '..';

describe('findable', () => {
	class TestCard extends Mix(Card) {
		static __reset() {
			this.instances.clear();
		}
	}
	class TestFindable extends Mix(CardSet<TestCard>, Findable<TestCard>) {}

	const makeFindable = () => {
		TestCard.__reset();
		const card1 = new TestCard();
		const card2 = new TestCard();
		const card3 = new TestCard();
		const card4 = new TestCard();
		const card5 = new TestCard();
		const card6 = new TestCard();
		const cardSet = new TestFindable([
			card1,
			card2,
			card3,
			card4,
			card5,
			card6,
		]);

		return { card1, card2, card3, card4, card5, card6, cardSet };
	};

	it('is Findable', () => {
		const cardSet = new TestFindable();
		expect(isFindable(cardSet)).toBe(true);
	});

	it('find', () => {
		const { card3, cardSet } = makeFindable();
		const card = cardSet.find((c) => c.id % 3 === 0);
		expect(card).toBe(card3);
	});

	it('findIndex', () => {
		const { cardSet } = makeFindable();
		const index = cardSet.findIndex((c) => c.id % 3 === 0);
		expect(index).toBe(2);
	});

	it('findRight', () => {
		const { card6, cardSet } = makeFindable();
		const card = cardSet.findRight((c) => c.id % 3 === 0);
		expect(card).toBe(card6);
	});

	it('findIndexRight', () => {
		const { cardSet } = makeFindable();
		const index = cardSet.findIndexRight((c) => c.id % 3 === 0);
		expect(index).toBe(5);
	});
});
