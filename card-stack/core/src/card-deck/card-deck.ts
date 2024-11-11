import { CardSet } from '../card-set/card-set';
import { Takeable } from '../card-set/takeable';
import { Indexable } from '../shared/indexable';
import { Ownable } from '../shared/ownable';
import {
	HexByte,
} from '../types';
import {
	hasMixin,
	Mix,
} from '../utils';

export class CardDeck extends Mix(CardSet, Indexable, Takeable, Ownable) {
	static HexByte = HexByte.DeckIndex;
}

export const isCardDeck = (obj: unknown): obj is CardDeck =>
	hasMixin(obj, CardDeck);
