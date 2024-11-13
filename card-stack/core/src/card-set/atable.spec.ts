import { Atable, Card, CardSet, isAtable, Mix } from '..';

describe('atable', () => {
	class TestCard extends Mix(Card) {}
	class TestAtable extends Mix(CardSet<TestCard>, Atable) {}

	it('is Atable', () => {
		const atable = new TestAtable();
		expect(isAtable(atable)).toBe(true);
	});

	it('accepts a single index', () => {
		const card1 = new TestCard();
		const card2 = new TestCard();
		const cardSet = new TestAtable([card1, card2]);
		expect(cardSet.at(0)).toBe(card1);
		expect(cardSet.at(1)).toBe(card2);
		expect(cardSet.at(-1)).toBe(card2);
		expect(cardSet.at(-2)).toBe(card1);
	});

	it('accepts multiple indexes', () => {
		const card1 = new TestCard();
		const card2 = new TestCard();
		const cardSet = new TestAtable([card1, card2]);
		expect(cardSet.at(0, 1)).toStrictEqual([card1, card2]);
		expect(cardSet.at(1, 0)).toStrictEqual([card2, card1]);
		expect(cardSet.at(1, -1)).toStrictEqual([card2]);
		expect(cardSet.at(-1, -2)).toStrictEqual([card2, card1]);
	});
});
