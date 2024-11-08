import { type Player } from '.';
import { hasMixin } from '..';

export interface Scoreable extends Player {}
export class Scoreable {
	protected _score = 0;

	get score() {
		return this._score;
	}

	addScore(score = 1) {
		this._score += score;

		return this;
	}

	subScore(score = 1) {
		this._score -= score;

		return this;
	}
}

export const isScoreable = (obj: unknown): obj is Scoreable =>
	hasMixin(obj, Scoreable);
