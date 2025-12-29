import { Card, CardDeck, Deckable, isCardDeck, isDeckable, Mix } from '..';

describe('deckable', () => {
	class TestCard extends Mix(Card) {}
	class TestDeck extends Mix(CardDeck<TestCard>) {
		constructor() {
			super();
			this.cards.push(new TestCard(), new TestCard(), new TestCard());
		}
	}
	class TestDeckable extends Deckable<TestDeck> {
		deck = new TestDeck();
	}

	it('is Deckable', () => {
		const deckable = new TestDeckable();
		expect(isDeckable(deckable)).toBe(true);
	});

	it('has deck', () => {
		const deckable = new TestDeckable();
		expect(isCardDeck(deckable.deck)).toBe(true);
	});
});
