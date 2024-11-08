import { type Player } from '.';
import { hasMixin } from '..';

export interface Nameable extends Player {}
export class Nameable {
	name?: string;

	init(...args: any[]) {
		for (const arg of args) {
			if (typeof arg === 'string') {
				this.name = arg;
				break;
			}
		}
	}
}

export const isNameable = (obj: unknown): obj is Nameable =>
	hasMixin(obj, Nameable);
