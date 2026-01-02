export type JsonPathErrorCode =
	| 'JSONPATH_SYNTAX_ERROR'
	| 'JSONPATH_EVALUATION_ERROR'
	| 'JSONPATH_PLUGIN_ERROR'
	| 'JSONPATH_CONFIG_ERROR';

export const JsonPathErrorCodes = {
	Syntax: 'JSONPATH_SYNTAX_ERROR',
	Evaluation: 'JSONPATH_EVALUATION_ERROR',
	Plugin: 'JSONPATH_PLUGIN_ERROR',
	Config: 'JSONPATH_CONFIG_ERROR',
} as const satisfies Record<string, JsonPathErrorCode>;
