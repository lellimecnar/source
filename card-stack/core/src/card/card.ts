import { type CardSet } from '../card-set';
import { Indexable } from '../shared/indexable';
import { Parentable } from '../shared/parentable';
import { HexByte } from '../types';
import { isCardSet, Mix, toHex } from '../utils';

export class Card extends Mix(Indexable, Parentable<CardSet>) {
	static getCard(id: number): Card | undefined {
		return this.getInstance(id) as Card | undefined;
	}

	static HexByte = HexByte.CardIndex;

	get id(): number {
		// // @ts-expect-error: index is readonly
		// this.index ??= (this.constructor as typeof Card).getIndex(1);

		let id = this.index;

		if ('rank' in this && typeof this.rank === 'number') {
			id += this.rank;
		}

		if ('suit' in this && typeof this.suit === 'number') {
			id += this.suit;
		}

		if (
			'deck' in this &&
			this.deck &&
			typeof this.deck === 'object' &&
			'index' in this.deck &&
			typeof this.deck.index === 'number'
		) {
			id += this.deck.index;
		}

		if (
			'parent' in this &&
			this.parent &&
			typeof this.parent === 'object' &&
			'index' in this.parent &&
			typeof this.parent.index === 'number'
		) {
			id += this.parent.index;
		}

		// console.dir({ fn: 'get id()', index: toHex(this.index), id: toHex(id) });
		return id;
	}

	[Symbol.for('nodejs.util.inspect.custom')](): string {
		return `${(this.constructor as typeof Card).name}<${toHex(this.id) ?? this.id}>`;
	}

	[Symbol.toPrimitive](hint: unknown): string | number | null | undefined {
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

	init(...args: unknown[]): void {
		super.init(...args);

		this.parent = args.find((arg) => isCardSet(arg));
	}
}
