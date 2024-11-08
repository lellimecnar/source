import { Card, CardSet, isCardSet, isIndexable, isParentable, Mix } from '..';

describe('cardSet', () => {
	class TestCard extends Mix(Card) {}
	class TestCardSet extends Mix(CardSet<TestCard>) {}

	it('is CardSet', () => {
		const cardSet = new TestCardSet();
		expect(isCardSet(cardSet)).toBe(true);
	});

	it('is Indexable', () => {
		const cardSet = new TestCardSet();
		expect(isIndexable(cardSet)).toBe(true);
	});

	it('is Parentable', () => {
		const cardSet = new TestCardSet();
		expect(isParentable(cardSet)).toBe(true);
	});

	it('takes card array', () => {
		const card1 = new TestCard();
		const card2 = new TestCard();
		const cardSet = new TestCardSet([card1, card2]);
		expect(cardSet.size).toBe(2);
		expect([...cardSet]).toStrictEqual([card1, card2]);
	});
});
