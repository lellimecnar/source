import { CardSet, Mix, Takeable, hasMixin } from '..';

export class CardDeck extends Mix(CardSet, Takeable) {}

export const isCardDeck = (obj: unknown): obj is CardDeck =>
	hasMixin(obj, CardDeck);
