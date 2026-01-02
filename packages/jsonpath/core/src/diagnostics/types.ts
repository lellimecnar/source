import type { JsonPathErrorCode } from '../errors/codes';
import type { JsonPathLocation } from '../errors/types';

export type JsonPathDiagnostic = {
	level: 'error' | 'warning' | 'info';
	code: JsonPathErrorCode;
	message: string;
	expression?: string;
	location?: JsonPathLocation;
	pluginId?: string;
};
