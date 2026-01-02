import type { JsonPathErrorCode } from './codes';

export type JsonPathLocation = {
	offset: number;
	line?: number;
	column?: number;
};

export type JsonPathErrorMeta = {
	code: JsonPathErrorCode;
	message: string;
	expression?: string;
	location?: JsonPathLocation;
	pluginIds?: string[];
	options?: unknown;
};
