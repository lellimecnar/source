import { type Player } from '../player/player';
import { hasMixin } from '../utils';

export class Ownable<T extends Player = Player> {
	owner?: T;
}

export const isOwnable = (obj: unknown): obj is Ownable =>
	Boolean(obj?.constructor && hasMixin(obj, Ownable));
