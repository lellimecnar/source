import { type Card, hasMixin, Indexable, isCard, Mix, Parentable } from '..';

export class CardSet<T extends Card = Card> extends Mix(
	Indexable,
	Parentable<CardSet>,
) {
	protected readonly cards = [] as T[];

	get size() {
		return this.cards.length;
	}

	constructor(cards?: T[], parent?: CardSet<T>);
	constructor(parent?: CardSet<T>);
	constructor(...args: unknown[]) {
		super(...(args as []));
	}

	init(...args: unknown[]) {
		// @ts-expect-error: cards is readonly
		this.cards ??= [];

		for (const arg of args) {
			if (
				arg &&
				Array.isArray(arg) &&
				arg.length &&
				arg.some((item) => item && isCard(item))
			) {
				this.cards.push(...arg);
				continue;
			}

			if (arg && isCardSet(arg)) {
				this.parent ??= arg;
				continue;
			}
		}
	}

	*[Symbol.iterator]() {
		for (const card of this.cards) {
			yield card;
		}
	}
}

export const isCardSet = (obj: unknown): obj is CardSet =>
	Boolean(obj && hasMixin(obj, CardSet));
