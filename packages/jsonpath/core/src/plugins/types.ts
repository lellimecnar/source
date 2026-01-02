import type { Scanner } from '@jsonpath/lexer';
import type { JsonPathParser } from '@jsonpath/parser';

import type { EvaluatorRegistry, ResultRegistry } from '../runtime/hooks';
import type { EngineLifecycleHooks } from '../runtime/lifecycle';

export type JsonPathPluginId = string;

export type JsonPathCapability = string;

export interface JsonPathPluginMeta {
	id: JsonPathPluginId;
	capabilities?: readonly JsonPathCapability[];
	dependsOn?: readonly JsonPathPluginId[];
	optionalDependsOn?: readonly JsonPathPluginId[];
	peerDependencies?: readonly string[];
}

export interface PluginSetupContext<Config = any> {
	pluginId: JsonPathPluginId;
	config: Config | undefined;
	engine: {
		scanner: Scanner;
		parser: JsonPathParser;
		evaluators: EvaluatorRegistry;
		results: ResultRegistry;
		lifecycle: EngineLifecycleHooks;
	};
}

export interface JsonPathPlugin<Config = any> {
	meta: JsonPathPluginMeta;
	setup: (ctx: PluginSetupContext<Config>) => void;
}
