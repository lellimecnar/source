import { HexByte, Indexable, Mix, hasMixin } from '..';

export class Player extends Mix(Indexable) {
	static override HexByte = HexByte.PlayerIndex;
}

export const isPlayer = (obj: unknown): obj is Player => hasMixin(obj, Player);
