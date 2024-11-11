import { type CardDeck } from '../card-deck/card-deck';
import { hasMixin } from '../utils';

export class Deckable {
	deck?: CardDeck;
}

export const isDeckable = (obj: unknown): obj is Deckable =>
	Boolean(obj?.constructor && hasMixin(obj, Deckable));
