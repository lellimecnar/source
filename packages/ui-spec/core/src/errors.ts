export type UISpecErrorCode = string;

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
