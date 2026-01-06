import { applyMergePatch, createMergePatch } from '@jsonpath/merge-patch';

import { type JsonMergePatchAdapter } from './types';

export const lellimecnarMergePatchAdapter: JsonMergePatchAdapter = {
	kind: 'merge-patch',
	name: '@jsonpath/merge-patch',
	features: {
		mutatesInput: false,
	},
	apply: <T extends object>(source: T, patch: object): T => {
		return applyMergePatch(source, patch) as T;
	},
	generate: (source: object, target: object): object => {
		return createMergePatch(source, target) as object;
	},
	smokeTest: (): boolean => {
		interface Doc {
			title: string;
			author: {
				givenName: string;
				familyName?: string;
			};
		}
		const source: Doc = {
			title: 'Goodbye!',
			author: { givenName: 'John', familyName: 'Doe' },
		};
		const patch = { title: 'Hello!', author: { familyName: null } };
		const target = applyMergePatch({ ...source }, patch) as Doc;
		return target.title === 'Hello!' && target.author.familyName === undefined;
	},
};
