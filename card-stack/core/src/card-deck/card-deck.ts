/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
/* eslint-disable @typescript-eslint/no-extraneous-class -- ignore */
import { CardSet } from '../card-set/card-set';
import { Takeable } from '../card-set/takeable';
import { Indexable } from '../shared/indexable';
import { Ownable } from '../shared/ownable';
import { HexByte } from '../types';
import { hasMixin, mix } from '../utils';

export interface CardDeck extends CardSet, Indexable, Takeable, Ownable {}
@mix(CardSet, Indexable, Takeable, Ownable)
export class CardDeck {
	static HexByte = HexByte.DeckIndex;
}

export const isCardDeck = (obj: unknown): obj is CardDeck =>
	hasMixin(obj, CardDeck);
