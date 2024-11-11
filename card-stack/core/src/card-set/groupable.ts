import { groupBy } from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { CardSortKey } from '../card/types';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Groupable extends CardSet {}
export class Groupable {
	groupBy<T extends string | number>(
		iteratee: CardSortKey | ((card: Card) => T),
	) {
		if (
			typeof iteratee === 'string' &&
			Object.values(CardSortKey).includes(iteratee)
		) {
			iteratee = (card: Card): T => {
				switch (iteratee) {
					case CardSortKey.PARENT:
						return (
							'parent' in card &&
							card.parent &&
							typeof card.parent === 'object' &&
							'index' in card.parent &&
							typeof card.parent.index === 'number'
								? card.parent.index
								: 'undefined'
						) as T;
					case CardSortKey.DECK:
						return (
							'deck' in card &&
							card.deck &&
							typeof card.deck === 'object' &&
							'index' in card.deck &&
							typeof card.deck.index === 'number'
								? card.deck.index
								: 'undefined'
						) as T;
					case CardSortKey.INDEX:
						return card.index as T;
					case CardSortKey.SUIT:
						return ('suit' in card ? card.suit : 'undefined') as T;
					case CardSortKey.RANK:
						return ('rank' in card ? card.rank : 'undefined') as T;
					default:
						return 'undefined' as T;
				}
			};
		}

		return groupBy<Card>([...this.cards], iteratee);
	}
}

export const isGroupable = (obj: unknown): obj is Groupable =>
	hasMixin(obj, Groupable);
