import type { PathNode } from '@jsonpath/ast';

export type CompileResult = {
	expression: string;
	ast: PathNode;
};

export type EvaluateOptions = {
	resultType?: 'value' | 'node' | 'path' | 'pointer' | 'parent';
};

export type JsonPathEngine = {
	compile: (expression: string) => CompileResult;
	parse: (expression: string) => PathNode;
	evaluateSync: (
		compiled: CompileResult,
		json: unknown,
		options?: EvaluateOptions,
	) => unknown[];
	evaluateAsync: (
		compiled: CompileResult,
		json: unknown,
		options?: EvaluateOptions,
	) => Promise<unknown[]>;
};
