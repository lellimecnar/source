import { Card, CardDeck, isCardDeck, isCardSet, isIndexable, Mix } from '..';

describe('cardDeck', () => {
	class TestCard extends Mix(Card) {}
	class TestCardDeck extends Mix(CardDeck<TestCard>) {}

	it('is CardDeck', () => {
		const deck = new TestCardDeck();
		expect(isCardDeck(deck)).toBe(true);
	});

	it('is CardSet', () => {
		const deck = new TestCardDeck();
		expect(isCardSet(deck)).toBe(true);
	});

	it('is Indexable', () => {
		const deck = new TestCardDeck();
		expect(isIndexable(deck)).toBe(true);
	});
});
