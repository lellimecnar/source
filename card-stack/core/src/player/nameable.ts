import { hasMixin } from '../utils';
import { type Player } from './player';

export interface Nameable extends Player {}
export class Nameable {
	name?: string;
}

export const isNameable = (obj: unknown): obj is Nameable =>
	hasMixin(obj, Nameable);
