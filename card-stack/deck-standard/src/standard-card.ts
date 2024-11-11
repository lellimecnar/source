import {
	Card,
	createEnum,
	Deckable,
	Mix,
	Ownable,
	Rankable,
	Suitable,
	type Player
} from '@card-stack/core';
import { StandardDeck } from '.';

const RANK = createEnum([
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
const SUIT = createEnum(['Hearts', 'Diamonds', 'Spades', 'Clubs']);
export class StandardCard extends Mix(Card, Suitable, Rankable, Ownable, Deckable) {
	static readonly RANK = RANK;
	static readonly SUIT = SUIT;

	constructor(
		suit: typeof StandardCard.SUIT,
		rank: typeof StandardCard.RANK,
		deck?: StandardDeck,
		owner?: Player,
	) {
		super();

		this.suit = suit;
		this.rank = rank;
		this.deck = deck;
		this.owner = owner ?? deck?.owner;
	}
}
