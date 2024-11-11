import { CardDeck, Mix, isPlayer } from '@card-stack/core';

import { StandardCard } from '.';

export class StandardDeck extends Mix(CardDeck<StandardCard>) {
	init(...args: unknown[]) {
		for (const arg of args) {
			if (isPlayer(arg)) {
				this.owner ??= arg;
				break;
			}
		}
		for (const suit of StandardCard.SUIT) {
			for (const rank of StandardCard.RANK) {
				const card = new StandardCard(suit, rank, this.owner);
				card.deck = this;
				this.cards.push(card);
			}
		}
	}
}
