import { CardUtils } from '.';
import {
	type CardSet,
	HexByte,
	Indexable,
	Mix,
	Parentable,
	hasMixin,
	isCardSet,
	toHex,
} from '..';

export class Card extends Mix(Indexable, Parentable<CardSet>) {
	static getCard(id: HexByte | Card): Card | undefined {
		return (this as unknown as typeof Card).getInstance(id) as Card | undefined;
	}

	static HexByte = HexByte.CardIndex;

	get id(): number {
		// @ts-expect-error: index is readonly
		this.index ??= (this.constructor as typeof Card).getIndex(1);

		let id = this.index;
		// console.dir({ id, this: this });

		if (CardUtils.hasRank(this)) {
			id += this.rank;
		}

		if (CardUtils.hasSuit(this)) {
			id += this.suit;
		}

		if (CardUtils.hasDeck(this)) {
			id += this.deck.index;
		}

		if (CardUtils.hasParent(this)) {
			id += this.parent.index;
		}

		return id;
	}

	[Symbol.for('nodejs.util.inspect.custom')]() {
		const ctor = this.constructor as unknown as typeof Card;
		return `${ctor.name}<${toHex(this.id)}>`;
	}

	[Symbol.toPrimitive](hint: unknown) {
		switch (hint) {
			case 'number':
				return this.id;
			case 'string':
				return toHex(this.id);
			default:
				return null;
		}
	}

	constructor(...args: unknown[]) {
		super(...(args as []));
	}

	init(...args: unknown[]) {
		// @ts-expect-error: index is readonly
		this.index = this.constructor.getIndex(1);

		for (const arg of args) {
			if (isCardSet(arg)) {
				this.parent ??= arg;
				break;
			}
		}
	}
}

export const isCard = (obj: unknown): obj is Card => hasMixin(obj, Card);
