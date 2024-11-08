import {
	type Card,
	CardSortKey,
	type Suitable,
	isCard,
	isFlippable,
	isRankable,
	isSuitable,
} from '.';
import {
	type CardDeck,
	type CardSet,
	type Deckable,
	HexByte,
	isCardDeck,
	isCardSet,
	isDeckable,
} from '..';

export { isCard, isDeckable, isFlippable, isRankable, isSuitable };

export const hasDeck = (
	card: Card,
): card is Card & Deckable & { deck: CardDeck } =>
	Boolean(isDeckable(card) && 'deck' in card && isCardDeck(card.deck));

export const hasParent = (card: Card): card is Card & { parent: CardSet } =>
	isCardSet(card.parent);

export const hasSuit = (
	card: Card,
): card is Card & Suitable & { suit: number } =>
	Boolean(
		isSuitable(card) &&
			typeof card.suit === 'number' &&
			!Number.isNaN(card.suit),
	);

export const hasRank = (
	card: Card,
): card is Card & { rank: number } & Suitable =>
	Boolean(
		isRankable(card) &&
			typeof card.rank === 'number' &&
			!Number.isNaN(card.rank),
	);

export const diff = <K extends CardSortKey = CardSortKey>(
	card1: Card,
	card2: Card,
	...keys: K[]
): Record<K, number> => {
	const result = {} as Record<K, number>;

	if (!keys.length) {
		keys.push(...(Object.values(CardSortKey) as K[]));
	}

	for (const key of keys) {
		switch (key) {
			case CardSortKey.PARENT:
				if (isCardSet(card1.parent) && isCardSet(card2.parent)) {
					result[key] = card1.parent.index - card2.parent.index;
				}
				break;
			case CardSortKey.DECK:
				if (
					isDeckable(card1) &&
					isDeckable(card2) &&
					'deck' in card1 &&
					isCardDeck(card1.deck) &&
					'deck' in card2 &&
					isCardDeck(card2.deck)
				) {
					result[key] = card1.deck.index - card2.deck.index;
				}
				break;
			case CardSortKey.INDEX:
				result[key] = card1.index - card2.index;
				break;
			case CardSortKey.SUIT:
				if (isSuitable(card1) && isSuitable(card2)) {
					result[key] = card1.suit - card2.suit;
				}
				break;
			case CardSortKey.RANK:
				if (isRankable(card1) && isRankable(card2)) {
					result[key] = card1.rank - card2.rank;
				}
				break;
			case CardSortKey.ID:
				result[key] = card1.id - card2.id;
				break;
		}
	}

	return result;
};

export const isSameSuit = (card1: Card, card2: Card): boolean =>
	Boolean(isSuitable(card1) && isSuitable(card2) && card1.suit === card2.suit);

export const isHigherSuit = (card1: Card, card2: Card): boolean =>
	Boolean(isSuitable(card1) && isSuitable(card2) && card1.suit > card2.suit);

export const isLowerSuit = (card1: Card, card2: Card): boolean =>
	Boolean(isSuitable(card1) && isSuitable(card2) && card1.suit < card2.suit);

export const diffSuit = (card1: Card, card2: Card) => {
	const suit = diff(card1, card2, CardSortKey.SUIT)[CardSortKey.SUIT];

	if (typeof suit === 'number') {
		return suit / HexByte.CardSuit;
	}
};

export const isAdjacentSuit = (card1: Card, card2: Card): boolean =>
	Boolean(
		isSuitable(card1) &&
			isSuitable(card2) &&
			Math.abs(card1.suit - card2.suit) === 1,
	);

export const isSameRank = (card1: Card, card2: Card): boolean =>
	Boolean(isRankable(card1) && isRankable(card2) && card1.rank === card2.rank);

export const isHigherRank = (card1: Card, card2: Card): boolean =>
	Boolean(isRankable(card1) && isRankable(card2) && card1.rank > card2.rank);

export const isLowerRank = (card1: Card, card2: Card): boolean =>
	Boolean(isRankable(card1) && isRankable(card2) && card1.rank < card2.rank);

export const diffRank = (card1: Card, card2: Card) => {
	const rank = diff(card1, card2, CardSortKey.RANK)[CardSortKey.RANK];

	if (typeof rank === 'number') {
		return rank / HexByte.CardRank;
	}
};

export const isAdjacentRank = (card1: Card, card2: Card): boolean =>
	Boolean(
		isRankable(card1) &&
			isRankable(card2) &&
			Math.abs(card1.rank - card2.rank) === 1,
	);
