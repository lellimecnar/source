import { hasMixin } from '..';

export class Parentable<T> {
	parent?: T;

	hasAncestor(obj: unknown): obj is Parentable<this> {
		const parent = this.parent;

		if (!parent) {
			return false;
		}

		// eslint-disable-next-line @typescript-eslint/no-this-alias -- ignore
		let curr: unknown = this;

		while (
			curr &&
			typeof curr === 'object' &&
			'parent' in curr &&
			curr.parent
		) {
			curr = curr.parent;

			if (curr === obj) {
				return true;
			}
		}

		return false;
	}
}

export const isParentable = (obj: unknown): obj is Parentable<unknown> =>
	Boolean(obj?.constructor && hasMixin(obj, Parentable));
