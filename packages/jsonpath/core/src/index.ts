export { JsonPathError } from './errors/JsonPathError';
export { JsonPathErrorCodes } from './errors/codes';
export type { JsonPathErrorCode } from './errors/codes';
export type { JsonPathErrorMeta, JsonPathLocation } from './errors/types';

export { DiagnosticsCollector } from './diagnostics/collect';
export type { JsonPathDiagnostic } from './diagnostics/types';

export type {
	JsonPathPlugin,
	JsonPathPluginMeta,
	JsonPathPluginId,
	JsonPathCapability,
} from './plugins/types';
export { resolvePlugins } from './plugins/resolve';
export { PluginRegistry } from './plugins/registry';
