/**
 * @jsonpath/core
 *
 * Error hierarchy for JSONPath operations.
 *
 * @packageDocumentation
 */

/**
 * Error codes for JSONPath operations.
 */
export type ErrorCode =
	| 'SYNTAX_ERROR'
	| 'TYPE_ERROR'
	| 'REFERENCE_ERROR'
	| 'POINTER_ERROR'
	| 'PATCH_ERROR'
	| 'FUNCTION_ERROR'
	| 'INVALID_ARGUMENT';

/**
 * Base class for all JSONPath-related errors.
 */
export class JSONPathError extends Error {
	readonly code: ErrorCode;
	readonly position?: number;
	readonly path?: string;
	override readonly cause?: Error;

	constructor(
		message: string,
		code: ErrorCode,
		options?: { position?: number; path?: string; cause?: Error },
	) {
		super(message);
		this.name = 'JSONPathError';
		this.code = code;
		this.position = options?.position;
		this.path = options?.path;
		this.cause = options?.cause;

		// Ensure correct prototype chain for inheritance
		Object.setPrototypeOf(this, new.target.prototype);
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			position: this.position,
			path: this.path,
			cause: this.cause ? String(this.cause) : undefined,
		};
	}
}

/**
 * Thrown when a JSONPath query has invalid syntax.
 */
export class JSONPathSyntaxError extends JSONPathError {
	constructor(message: string, options?: { position?: number; cause?: Error }) {
		super(message, 'SYNTAX_ERROR', options);
		this.name = 'JSONPathSyntaxError';
	}
}

/**
 * Thrown when an operation is performed on an incompatible type.
 */
export class JSONPathTypeError extends JSONPathError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, 'TYPE_ERROR', options);
		this.name = 'JSONPathTypeError';
	}
}

/**
 * Thrown when a reference cannot be resolved.
 */
export class JSONPathReferenceError extends JSONPathError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, 'REFERENCE_ERROR', options);
		this.name = 'JSONPathReferenceError';
	}
}

/**
 * Thrown when a JSON Pointer operation fails.
 */
export class JSONPointerError extends JSONPathError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, 'POINTER_ERROR', options);
		this.name = 'JSONPointerError';
	}
}

/**
 * Thrown when a JSON Patch operation fails.
 */
export class JSONPatchError extends JSONPathError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, 'PATCH_ERROR', options);
		this.name = 'JSONPatchError';
	}
}
