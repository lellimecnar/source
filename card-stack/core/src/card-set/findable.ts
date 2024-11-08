import { type CardSet, CardSetUtils } from '.';
import { hasMixin } from '..';
import type { FuncArgs } from './utils';

export interface Findable extends CardSet {}
export class Findable {
	find(...args: FuncArgs<typeof CardSetUtils.find>) {
		return CardSetUtils.find(this.cards, ...args);
	}

	findIndex(...args: FuncArgs<typeof CardSetUtils.findIndex>) {
		return CardSetUtils.findIndex(this.cards, ...args);
	}

	findRight(...args: FuncArgs<typeof CardSetUtils.findRight>) {
		return CardSetUtils.findRight(this.cards, ...args);
	}

	findIndexRight(...args: FuncArgs<typeof CardSetUtils.findIndexRight>) {
		return CardSetUtils.findIndexRight(this.cards, ...args);
	}
}

export const isFindable = (obj: unknown): obj is Findable =>
	hasMixin(obj, Findable);
