/* eslint-disable @typescript-eslint/no-empty-interface -- ignore */
/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { HexByte, type EnumType } from '../types';
import { createEnum, isCard } from '../utils';
import { type Card } from './card';

export interface Suitable extends Card {}
export class Suitable {
	static SUIT: SuitEnumType<any>;

	readonly suit!: number;

	get suitName(): string {
		return (this.constructor as typeof Suitable).SUIT[this.suit] as string;
	}

	init(...args: unknown[]): void {
		if (!isCard(this)) {
			throw new Error(`Suitable must be mixed with Card`);
		}

		const ctor = this.constructor as typeof Suitable;

		if (!('SUIT' in ctor) || typeof ctor.SUIT !== 'object') {
			throw new Error(`SUIT is not defined in ${(ctor as any).name}`);
		}

		const suit = args.find(
			(arg) =>
				typeof arg === 'number' &&
				arg in ctor.SUIT &&
				ctor.SUIT[arg] &&
				typeof ctor.SUIT[arg] === 'string',
		);

		// @ts-expect-error: suit is readonly
		this.suit = suit;
	}
}

const SuitBrand = Symbol('SuitBrand');

export type SuitEnumType<K extends string = string> = EnumType<K> & {
	readonly [SuitBrand]: unique symbol;
};

export const createSuitEnum = <K extends string>(
	keys: readonly K[],
): SuitEnumType<K> => createEnum(keys, HexByte.CardSuit) as SuitEnumType<K>;
