export type UISpecErrorCode =
	| 'INVALID_SCHEMA'
	| 'INVALID_SCHEMA_VERSION'
	| 'MISSING_ROOT'
	| 'INVALID_NODE'
	| 'INVALID_NODE_TYPE'
	| 'INVALID_CHILDREN'
	| 'INVALID_BINDING';

export class UISpecError extends Error {
	public readonly code: UISpecErrorCode;
	public readonly path: string;

	constructor(code: UISpecErrorCode, message: string, path: string) {
		super(message);
		this.name = 'UISpecError';
		this.code = code;
		this.path = path;
	}
}
