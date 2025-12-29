/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */

import {
	Card,
	CardDeck,
	Rankable,
	Suitable,
	createRankEnum,
	createSuitEnum,
	hasMixin,
	mixin,
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

export interface StandardCard extends Card, Suitable, Rankable {}

@mixin(Suitable, Rankable)
export class StandardCard extends Card {
	static readonly RANK = RANK;
	static readonly SUIT = SUIT;

	// eslint-disable-next-line @typescript-eslint/no-useless-constructor -- needed for types
	constructor(suit: number, rank: number) {
		super(suit, rank);
	}
}

export class StandardDeck extends CardDeck<StandardCard> {
	constructor() {
		super();

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
