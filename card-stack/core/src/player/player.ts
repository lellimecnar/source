import { Indexable } from '../shared/indexable';
import { HexByte } from '../types';
import { Mix, hasMixin } from '../utils';

export class Player extends Mix(Indexable) {
	static override HexByte = HexByte.PlayerIndex;
}

export const isPlayer = (obj: unknown): obj is Player => hasMixin(obj, Player);
