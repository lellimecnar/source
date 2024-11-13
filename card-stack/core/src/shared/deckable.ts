import { type CardDeck } from '../card-deck/card-deck';
import { isCardDeck, isOwnable, isPlayer } from '../utils';

export class Deckable<D extends CardDeck<any>> {
	deck?: D;

	init(..._args: unknown[]): void {
		if (isCardDeck(this.deck)) {
			if (isOwnable(this.deck) && isPlayer(this)) {
				this.deck.owner = this;
			}
		}
	}
}
