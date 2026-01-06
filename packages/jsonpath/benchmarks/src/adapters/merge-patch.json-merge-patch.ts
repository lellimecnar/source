import jsonmergepatch from 'json-merge-patch';

import { type JsonMergePatchAdapter } from './types';

interface JsonMergePatchModule {
	apply: (source: unknown, patch: unknown) => unknown;
	generate: (source: unknown, target: unknown) => unknown;
}

const jsonMergePatch = jsonmergepatch as unknown as JsonMergePatchModule;

export const jsonMergePatchAdapter: JsonMergePatchAdapter = {
	kind: 'merge-patch',
	name: 'json-merge-patch',
	features: {
		mutatesInput: 'unknown',
	},
	apply: <T extends object>(source: T, patch: object): T => {
		return jsonMergePatch.apply(source, patch) as T;
	},
	generate: (source: object, target: object): object => {
		return jsonMergePatch.generate(source, target) as object;
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
		const target = jsonMergePatch.apply({ ...source }, patch) as Doc;
		return target.title === 'Hello!' && target.author.familyName === undefined;
	},
};
