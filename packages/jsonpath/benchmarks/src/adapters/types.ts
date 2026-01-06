export type SupportFlag = true | false | 'unknown';

export type AdapterKind = 'jsonpath' | 'pointer' | 'patch' | 'merge-patch';

export interface BaseAdapter {
	kind: AdapterKind;
	name: string;
}

export interface JsonPathFeatures {
	/** Whether the underlying engine is known to support filter expressions. */
	supportsFilter: SupportFlag;
	/** Whether the underlying engine is known to support script expressions/evaluation. */
	supportsScriptExpressions: SupportFlag;
	/** Whether the adapter can return node metadata (paths, etc.). */
	canReturnNodes: SupportFlag;
}

export interface JsonPathAdapter extends BaseAdapter {
	kind: 'jsonpath';
	features: JsonPathFeatures;
	queryValues: <T = unknown>(data: unknown, expression: string) => T[];
	/** Optional richer node results (library-specific shape). */
	queryNodes?: (data: unknown, expression: string) => unknown[];
	smokeTest: () => boolean;
}

export interface JsonPointerFeatures {
	supportsGet: true;
	supportsSet: SupportFlag;
	supportsRemove: SupportFlag;
	supportsHas: SupportFlag;
	supportsParse: SupportFlag;
	supportsCompile: SupportFlag;
	/** Whether calling set/remove mutates the input object (if supported). */
	mutatesInput: SupportFlag;
}

export interface JsonPointerAdapter extends BaseAdapter {
	kind: 'pointer';
	features: JsonPointerFeatures;
	get: <T = unknown>(obj: unknown, pointer: string | readonly string[]) => T;
	set?: (
		obj: unknown,
		pointer: string | readonly string[],
		value: unknown,
	) => unknown;
	remove?: (obj: unknown, pointer: string | readonly string[]) => unknown;
	has?: (obj: unknown, pointer: string | readonly string[]) => boolean;
	parse?: (pointer: string) => string[];
	compile?: (tokens: readonly string[]) => string;
	smokeTest: () => boolean;
}

export interface JsonPatchFeatures {
	/** Whether applyPatch mutates its input document. */
	mutatesInput: SupportFlag;
	/** Whether applyPatch returns a new (possibly same reference) document value. */
	returnsDocument: true;
}

export interface JsonPatchAdapter extends BaseAdapter {
	kind: 'patch';
	features: JsonPatchFeatures;
	applyPatch: <T>(document: T, patch: readonly unknown[]) => T;
	smokeTest: () => boolean;
}

export interface JsonMergePatchFeatures {
	/** Whether apply() mutates its input source. */
	mutatesInput: SupportFlag;
}

export interface JsonMergePatchAdapter extends BaseAdapter {
	kind: 'merge-patch';
	features: JsonMergePatchFeatures;
	apply: <T extends object>(source: T, patch: object) => T;
	generate: (source: object, target: object) => object;
	smokeTest: () => boolean;
}

export const toArray = <T>(value: Iterable<T> | ArrayLike<T> | T[]): T[] => {
	if (Array.isArray(value)) return value;
	return Array.from(value as Iterable<T>);
};
