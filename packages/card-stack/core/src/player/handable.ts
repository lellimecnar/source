/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { type CardSet } from '../card-set/card-set';
import { isPlayer } from '../utils';
import { type Player } from './player';

// eslint-disable-next-line -- use interface, not type
export interface Handable<H extends CardSet = CardSet> extends Player {}
export class Handable<H extends CardSet = CardSet> {
	hand?: H;

	init(..._args: unknown[]): void {
		if (!isPlayer(this)) {
			throw new Error(`Handable must be mixed with Player`);
		}
	}
}
