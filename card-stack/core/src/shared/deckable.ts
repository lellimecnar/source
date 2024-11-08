import { hasMixin, isCardDeck, isPlayer, type CardDeck } from '..';

export class Deckable {
	static CardDeck?: typeof CardDeck;
	deck?: CardDeck;

	init(...args: any[]) {
		for (const arg of args) {
			if (isCardDeck(arg)) {
				this.deck ??= arg;
			}
		}

		if (!isCardDeck(this.deck) && isPlayer(this)) {
			const ctor = this.constructor as typeof Deckable;

			if (ctor.CardDeck) {
				this.deck ??= new ctor.CardDeck();
			}
		}
	}
}

export const isDeckable = (obj: unknown): obj is Deckable =>
	Boolean(obj?.constructor && hasMixin(obj, Deckable));
