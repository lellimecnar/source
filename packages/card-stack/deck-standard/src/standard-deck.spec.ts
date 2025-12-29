import { isStandardDeck, StandardDeck } from '.';

// import { StandardDeck, isStandardDeck } from '.';
describe('standardDeck', () => {
	it('is StandardDeck', () => {
		expect(isStandardDeck(new StandardDeck())).toBe(true);
	});

	it('has cards', () => {
		const deck = new StandardDeck();
		expect(deck.size).toBe(52);
		expect(
			[...deck].map((card) => [card.rankName, card.suitName].join(' of ')),
		).toMatchSnapshot();
	});
});
