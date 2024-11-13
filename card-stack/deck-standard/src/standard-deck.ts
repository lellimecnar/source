import {
	Card,
	CardDeck,
	Mix,
	Rankable,
	Suitable,
	createRankEnum,
	createSuitEnum,
	hasMixin,
} from '@card-stack/core';

const RANK = createRankEnum([
	'Ace',
	'Two',
	'Three',
	'Four',
	'Five',
	'Six',
	'Seven',
	'Eight',
	'Nine',
	'Ten',
	'Jack',
	'Queen',
	'King',
]);
const SUIT = createSuitEnum(['Hearts', 'Diamonds', 'Spades', 'Clubs']);

export class StandardCard extends Mix(Card, Suitable, Rankable) {
	static readonly RANK = RANK;
	static readonly SUIT = SUIT;

	constructor(suit: number, rank: number) {
		super();

		// @ts-expect-error suit is readonly
		this.suit = suit;
		// @ts-expect-error rank is readonly
		this.rank = rank;
	}
}

export class StandardDeck extends Mix(CardDeck<StandardCard>) {
	init(..._args: unknown[]): void {
		for (const suit of StandardCard.SUIT) {
			for (const rank of StandardCard.RANK) {
				const card = new StandardCard(suit, rank);
				card.parent = this;
				this.cards.push(card);
			}
		}
	}
}

export const isStandardCard = (obj: unknown): obj is StandardCard =>
	hasMixin(obj, StandardCard);

export const isStandardDeck = (obj: unknown): obj is StandardDeck =>
	hasMixin(obj, StandardDeck);
