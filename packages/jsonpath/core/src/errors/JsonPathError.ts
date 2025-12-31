import type { JsonPathErrorMeta } from './types';

export class JsonPathError extends Error {
	public readonly code: JsonPathErrorMeta['code'];
	public readonly expression?: string;
	public readonly location?: JsonPathErrorMeta['location'];
	public readonly pluginIds?: string[];
	public readonly options?: unknown;

	public constructor(meta: JsonPathErrorMeta, cause?: unknown) {
		super(meta.message, cause ? { cause } : undefined);
		this.name = 'JsonPathError';
		this.code = meta.code;
		this.expression = meta.expression;
		this.location = meta.location;
		this.pluginIds = meta.pluginIds;
		this.options = meta.options;
	}
}
