export type UISpecErrorCode =
	| 'UI_SPEC_JSONP3_API_MISSING'
	| 'UI_SPEC_PATH_NOT_FOUND'
	| 'UI_SPEC_PATH_NOT_UNIQUE'
	| 'UI_SPEC_INVALID_SCHEMA'
	| 'UI_SPEC_FUNCTION_NOT_FOUND'
	| 'UI_SPEC_COMPONENT_NOT_FOUND'
	| 'UI_SPEC_PATCH_FAILED';

export class UISpecError extends Error {
	public readonly code: UISpecErrorCode;
	public readonly details?: Record<string, unknown>;

	public constructor(
		code: UISpecErrorCode,
		message: string,
		details?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'UISpecError';
		this.code = code;
		this.details = details;
	}

	public toJSON() {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			details: this.details,
		};
	}
}
