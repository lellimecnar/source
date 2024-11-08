import { type CardSet, CardSetUtils } from '.';
import { hasMixin } from '..';

export interface Atable extends CardSet {}
export class Atable {
	at(...indexes: number[]) {
		return CardSetUtils.at(this.cards, ...indexes);
	}
}

export const isAtable = (obj: unknown): obj is Atable => hasMixin(obj, Atable);
