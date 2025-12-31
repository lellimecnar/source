export type JsonPathCliConfig = {
	path: string;
	json: unknown;
	resultType?: 'value' | 'node' | 'path' | 'pointer' | 'parent';
};

export function parseConfig(input: unknown): JsonPathCliConfig {
	if (!input || typeof input !== 'object')
		throw new Error('Config must be an object.');
	const obj = input as any;
	if (typeof obj.path !== 'string')
		throw new Error('Config.path must be a string.');
	return {
		path: obj.path,
		json: obj.json,
		resultType: obj.resultType,
	};
}
