import { isParentable } from '../utils';

export class Parentable<T> {
	parent?: T;

	hasAncestor(obj: unknown): obj is Parentable<this> {
		const parent = this.parent;

		if (!parent) {
			return false;
		}

		// eslint-disable-next-line @typescript-eslint/no-this-alias -- ignore
		let curr: unknown = this;

		while (isParentable(curr)) {
			curr = curr.parent;

			if (curr === obj) {
				return true;
			}
		}

		return false;
	}
}
