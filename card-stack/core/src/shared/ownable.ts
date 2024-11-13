import { type Player } from '../player/player';

export class Ownable<T extends Player = Player> {
	owner?: T;
}
