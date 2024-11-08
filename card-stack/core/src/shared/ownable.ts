import { hasMixin, type Player } from '..';

export class Ownable<T extends Player = Player> {
	owner?: T;
}

export const isOwnable = (obj: unknown): obj is Ownable =>
	Boolean(obj?.constructor && hasMixin(obj, Ownable));
