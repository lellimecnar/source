/* eslint-disable @typescript-eslint/no-empty-interface,  @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { isPlayer } from '../utils';
import { type Player } from './player';

export interface Scoreable extends Player {}
export class Scoreable {
	static MIN_SCORE?: number;
	static MAX_SCORE?: number;
	static SCORE_INCREMENT = 1;
	static START_SCORE = 0;

	// @ts-expect-error defined in init
	protected _score: number;

	get score(): number {
		return this._score;
	}

	addScore(
		score = (this.constructor as typeof Scoreable).SCORE_INCREMENT,
	): this {
		const max = (this.constructor as typeof Scoreable).MAX_SCORE;
		if (typeof max === 'number') {
			this._score = Math.min(this._score + score, max);
		} else {
			this._score += score;
		}

		return this;
	}

	subScore(
		score = (this.constructor as typeof Scoreable).SCORE_INCREMENT,
	): this {
		const min = (this.constructor as typeof Scoreable).MIN_SCORE;
		if (typeof min === 'number') {
			this._score = Math.max(this._score - score, min);
		} else {
			this._score -= score;
		}

		return this;
	}

	init(..._args: unknown[]): void {
		if (!isPlayer(this)) {
			throw new Error(`Scoreable must be mixed with Player`);
		}

		this._score = (this.constructor as typeof Scoreable).START_SCORE;
	}
}
