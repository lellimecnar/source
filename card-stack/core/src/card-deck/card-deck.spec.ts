import {
	CardDeck,
	isCardDeck,
	isCardSet,
	isIndexable,
	isOwnable,
	isTakeable,
	Mix,
} from '..';

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

	it('is Indexable', () => {
		const deck = new TestCardDeck();
		expect(isIndexable(deck)).toBe(true);
	});

	it('is Takeable', () => {
		const deck = new TestCardDeck();
		expect(isTakeable(deck)).toBe(true);
	});

	it('is Ownable', () => {
		const deck = new TestCardDeck();
		expect(isOwnable(deck)).toBe(true);
	});
});
