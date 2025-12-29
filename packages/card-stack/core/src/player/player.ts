/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */

import { Indexable } from '../shared/indexable';
import { HexByte } from '../types';

// eslint-disable-next-line -- use interface, not type
export interface Player extends Indexable {}

export class Player extends Indexable {
	static HexByte = HexByte.PlayerIndex;
}
