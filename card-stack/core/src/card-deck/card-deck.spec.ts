import { CardDeck, Mix, isCardDeck, isCardSet, isTakeable } from '..';

describe('cardDeck', () => {
	class TestCardDeck extends Mix(CardDeck) {}

	it('is CardDeck', () => {
		const deck = new TestCardDeck();
		expect(isCardDeck(deck)).toBe(true);
	});

	it('is CardSet', () => {
		const deck = new TestCardDeck();
		expect(isCardSet(deck)).toBe(true);
	});

	it('is Takeable', () => {
		const deck = new TestCardDeck();
		expect(isTakeable(deck)).toBe(true);
	});
});
