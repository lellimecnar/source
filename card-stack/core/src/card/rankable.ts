import { type EnumType, HexByte } from '../types';
import { createEnum, isCard } from '../utils';
import { type Card } from './card';

export interface Rankable extends Card {
	//
}
export class Rankable {
	declare static RANK: RankEnumType<any>;

	readonly rank!: number;

	get rankName(): string {
		return (this.constructor as typeof Rankable).RANK[this.rank] as string;
	}

	init(...args: unknown[]): void {
		if (!isCard(this)) {
			throw new Error(`Rankable must be mixed with Card`);
		}

		const ctor = this.constructor as typeof Rankable;

		if (!('RANK' in ctor)) {
			throw new Error(`RANK is not defined in ${(ctor as any).name}`);
		}

		const rank = args.find(
			(arg) =>
				typeof arg === 'number' &&
				arg in ctor.RANK &&
				ctor.RANK[arg] &&
				typeof ctor.RANK[arg] === 'string',
		);

		// @ts-expect-error: rank is readonly
		this.rank = rank;
	}
}

const RankBrand = Symbol('RankBrand');

export type RankEnumType<K extends string = string> = EnumType<K> & {
	readonly [RankBrand]: unique symbol;
};

export const createRankEnum = <K extends string>(
	keys: readonly K[],
): RankEnumType<K> => createEnum(keys, HexByte.CardRank) as RankEnumType<K>;
