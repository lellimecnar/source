/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */

import { type CardSet } from '../card-set';
import { Indexable } from '../shared/indexable';
import { Parentable } from '../shared/parentable';
import { HexByte } from '../types';
import { isCardSet, mixin, toHex } from '../utils';

export interface Card extends Indexable, Parentable<CardSet> {}

class CardParentInit {
	init(...args: unknown[]): void {
		if ('parent' in (this as any) && (this as any).parent) {
			return;
		}

		(this as any).parent = args.find((arg) => {
			if (isCardSet(arg)) {
				return true;
			}

			return (
				Boolean(arg) &&
				typeof arg === 'object' &&
				'cards' in (arg as any) &&
				Array.isArray((arg as any).cards)
			);
		});
	}
}

@mixin(Parentable, CardParentInit)
export class Card extends Indexable {
	static getCard(id: number): Card | undefined {
		return this.getInstance(id) as Card | undefined;
	}

	static HexByte = HexByte.CardIndex;

	get id(): number {
		let id = this.index;

		if ('rank' in this && typeof (this as any).rank === 'number') {
			id += (this as any).rank;
		}

		if ('suit' in this && typeof (this as any).suit === 'number') {
			id += (this as any).suit;
		}

		if (
			'deck' in this &&
			(this as any).deck &&
			typeof (this as any).deck === 'object' &&
			typeof (this as any).deck.index === 'number'
		) {
			id += (this as any).deck.index;
		}

		if (
			'parent' in this &&
			this.parent &&
			typeof this.parent === 'object' &&
			'index' in this.parent &&
			typeof (this.parent as any).index === 'number'
		) {
			id += (this.parent as any).index;
		}

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
		super(...args);
	}
}
