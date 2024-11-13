import { Card, CardSet, isCardSet, Mix } from '..';

describe('cardSet', () => {
	class TestCard extends Mix(Card) {}
	class TestCardSet extends Mix(CardSet<TestCard>) {
		__push(...cards: TestCard[]): void {
			this.push(...cards);
		}
	}

	it('is CardSet', () => {
		const cardSet = new TestCardSet();
		expect(isCardSet(cardSet)).toBe(true);
	});

	it('is iterable', () => {
		const cardSet = new TestCardSet();
		expect(cardSet[Symbol.iterator]).toBeInstanceOf(Function);
		expect([...cardSet]).toStrictEqual([]);
	});

	it('takes card array', () => {
		const card1 = new TestCard();
		const card2 = new TestCard();
		const cardSet = new TestCardSet([card1, card2]);
		expect(cardSet.size).toBe(2);
		expect([...cardSet]).toStrictEqual([card1, card2]);
	});

	it('push', () => {
		const cardSet = new TestCardSet();
		const card1 = new TestCard();
		const card2 = new TestCard();
		cardSet.__push(card1, card2);
		expect(cardSet.size).toBe(2);
		expect([...cardSet]).toStrictEqual([card1, card2]);
	});
});
