import { Indexable } from '../shared/indexable';
import { HexByte } from '../types';
import { Mix } from '../utils';

export class Player extends Mix(Indexable) {
	static override HexByte = HexByte.PlayerIndex;
}
