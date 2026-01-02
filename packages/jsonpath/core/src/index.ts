export { JsonPathError } from './errors/JsonPathError';
export { JsonPathErrorCodes } from './errors/codes';
export type { JsonPathErrorCode } from './errors/codes';
export type { JsonPathErrorMeta, JsonPathLocation } from './errors/types';

export { DiagnosticsCollector } from './diagnostics/collect';
export type { JsonPathDiagnostic } from './diagnostics/types';

export type {
	JsonPathPlugin,
	PluginSetupContext,
	JsonPathPluginMeta,
	JsonPathPluginId,
	JsonPathCapability,
} from './plugins/types';
export { resolvePlugins } from './plugins/resolve';
export { PluginRegistry } from './plugins/registry';
export { createPlugin } from './plugins/createPlugin';
export { PluginPhases, PhaseOrder, type PluginPhase } from './plugins/phases';

export { createEngine } from './createEngine';
export type { JsonPathEngine, CompileResult, EvaluateOptions } from './engine';

export type { Location, LocationComponent } from './runtime/location';
export { appendIndex, appendMember, rootLocation } from './runtime/location';
export type { JsonPathNode } from './runtime/node';
export { rootNode } from './runtime/node';
export type { EvalContext } from './runtime/hooks';

export {
	EngineLifecycleHooks,
	type TokenTransform,
	type AstTransform,
	type EvaluateMiddlewareSync,
	type EvaluateMiddlewareAsync,
} from './runtime/lifecycle';
export {
	registerRfc9535ScanRules,
	registerRfc9535LiteralScanRules,
} from '@jsonpath/lexer';
