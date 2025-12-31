export type JsonPathPluginId = string;

export type JsonPathCapability = string;

export type JsonPathPluginMeta = {
	id: JsonPathPluginId;
	capabilities?: readonly JsonPathCapability[];
	dependsOn?: readonly JsonPathPluginId[];
	optionalDependsOn?: readonly JsonPathPluginId[];
	peerDependencies?: readonly string[];
};

export type JsonPathPlugin<Config = unknown> = {
	meta: JsonPathPluginMeta;
	configure?: (config: Config | undefined) => void;
};
