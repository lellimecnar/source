import type { Scanner } from '@jsonpath/lexer';
import type { JsonPathParser } from '@jsonpath/parser';

import type { PluginPhase } from './phases';
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
	phases: readonly PluginPhase[]; // Required: at least one phase
	allowMultiple?: boolean; // Default: false
	order?: {
		first?: boolean; // Run first in its phase
		last?: boolean; // Run last in its phase
		before?: readonly JsonPathPluginId[]; // Run before these plugins
		after?: readonly JsonPathPluginId[]; // Run after these plugins
	};
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
