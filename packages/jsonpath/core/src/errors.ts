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
	| 'INVALID_ARGUMENT'
	| 'SECURITY_ERROR'
	| 'LIMIT_ERROR'
	| 'TIMEOUT_ERROR'
	| 'UNEXPECTED_TOKEN'
	| 'UNEXPECTED_END'
	| 'INVALID_ESCAPE'
	| 'INVALID_NUMBER'
	| 'UNKNOWN_FUNCTION'
	| 'MAX_DEPTH_EXCEEDED'
	| 'TIMEOUT'
	| 'INVALID_ARRAY_INDEX'
	| 'TEST_FAILED'
	| 'PATH_NOT_FOUND';

/**
 * Base class for all JSONPath-related errors.
 */
export class JSONPathError extends Error {
	readonly code: ErrorCode;
	readonly position?: number;
	readonly path?: string;
	readonly token?: string;
	readonly value?: unknown;
	override readonly cause?: Error;

	constructor(
		message: string,
		code: ErrorCode,
		options?: {
			position?: number;
			path?: string;
			token?: string;
			value?: unknown;
			cause?: Error;
		},
	) {
		super(message);
		this.name = 'JSONPathError';
		this.code = code;
		this.position = options?.position;
		this.path = options?.path;
		this.token = options?.token; // gitleaks:allow
		this.value = options?.value;
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
			token: this.token, // gitleaks:allow
			value: this.value,
			cause: this.cause ? String(this.cause) : undefined,
		};
	}
}

/**
 * Thrown when a JSONPath query has invalid syntax.
 */
export class JSONPathSyntaxError extends JSONPathError {
	readonly expected?: string;
	readonly found?: string;

	constructor(
		message: string,
		options?: {
			position?: number;
			path?: string;
			token?: string;
			value?: unknown;
			expected?: string;
			found?: string;
			cause?: Error;
		},
	) {
		super(message, 'SYNTAX_ERROR', options);
		this.name = 'JSONPathSyntaxError';
		this.expected = options?.expected;
		this.found = options?.found;
	}

	override toJSON() {
		return {
			...super.toJSON(),
			expected: this.expected,
			found: this.found,
		};
	}
}

/**
 * Thrown when an operation is performed on an incompatible type.
 */
export class JSONPathTypeError extends JSONPathError {
	readonly expectedType?: string;
	readonly actualType?: string;

	constructor(
		message: string,
		options?: {
			path?: string;
			value?: unknown;
			expectedType?: string;
			actualType?: string;
			cause?: Error;
		},
	) {
		super(message, 'TYPE_ERROR', options);
		this.name = 'JSONPathTypeError';
		this.expectedType = options?.expectedType;
		this.actualType = options?.actualType;
	}

	override toJSON() {
		return {
			...super.toJSON(),
			expectedType: this.expectedType,
			actualType: this.actualType,
		};
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
	readonly operationIndex?: number;
	readonly operation?: string;

	constructor(
		message: string,
		options?: {
			path?: string;
			operationIndex?: number;
			operation?: string;
			cause?: Error;
		},
	) {
		super(message, 'PATCH_ERROR', options);
		this.name = 'JSONPatchError';
		this.operationIndex = options?.operationIndex;
		this.operation = options?.operation;
	}

	override toJSON() {
		return {
			...super.toJSON(),
			operationIndex: this.operationIndex,
			operation: this.operation,
		};
	}
}

/**
 * Thrown when a security policy is violated.
 */
export class JSONPathSecurityError extends JSONPathError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, 'SECURITY_ERROR', options);
		this.name = 'JSONPathSecurityError';
	}
}

/**
 * Thrown when a resource limit is exceeded.
 */
export class JSONPathLimitError extends JSONPathError {
	constructor(
		message: string,
		options?: { path?: string; cause?: Error; code?: ErrorCode },
	) {
		super(message, options?.code ?? 'LIMIT_ERROR', options);
		this.name = 'JSONPathLimitError';
	}
}

/**
 * Thrown when a function execution fails.
 */
export class JSONPathFunctionError extends JSONPathError {
	constructor(
		message: string,
		options?: {
			path?: string;
			token?: string;
			value?: unknown;
			cause?: Error;
			code?: ErrorCode;
		},
	) {
		super(message, options?.code ?? 'FUNCTION_ERROR', options);
		this.name = 'JSONPathFunctionError';
	}
}

/**
 * Thrown when an operation times out.
 */
export class JSONPathTimeoutError extends JSONPathError {
	constructor(
		message: string,
		options?: { path?: string; cause?: Error; code?: ErrorCode },
	) {
		super(message, options?.code ?? 'TIMEOUT', options);
		this.name = 'JSONPathTimeoutError';
	}
}
