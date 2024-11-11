import { hasMixin } from '../utils';
import { type Player } from './player';

export interface Scoreable extends Player {}
export class Scoreable {
	protected _score = 0;

	get score(): number {
		return this._score;
	}

	addScore(score = 1): this {
		this._score += score;

		return this;
	}

	subScore(score = 1): this {
		this._score -= score;

		return this;
	}
}

export const isScoreable = (obj: unknown): obj is Scoreable =>
	hasMixin(obj, Scoreable);
