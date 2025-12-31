import type { Scanner } from '@jsonpath/lexer';
import type { JsonPathParser } from '@jsonpath/parser';

import type { EvaluatorRegistry, ResultRegistry } from '../runtime/hooks';

export type JsonPathPluginId = string;

export type JsonPathCapability = string;

export interface JsonPathPluginMeta {
	id: JsonPathPluginId;
	capabilities?: readonly JsonPathCapability[];
	dependsOn?: readonly JsonPathPluginId[];
	optionalDependsOn?: readonly JsonPathPluginId[];
	peerDependencies?: readonly string[];
}

export interface EngineHooks {
	registerTokens?: (scanner: Scanner) => void;
	registerParsers?: (parser: JsonPathParser) => void;
	registerEvaluators?: (registry: EvaluatorRegistry) => void;
	registerResults?: (registry: ResultRegistry) => void;
}

export interface JsonPathPlugin<Config = unknown> {
	meta: JsonPathPluginMeta;
	configure?: (config: Config | undefined) => void;
	hooks?: EngineHooks;
}
