import type { JSONPointer } from '@jsonpath/pointer';
import type { PatchOperation } from '@jsonpath/patch';

export type Schema = unknown;

export interface ValidationError {
	readonly pointer?: JSONPointer;
	readonly code: string;
	readonly message: string;
	readonly expected?: unknown;
	readonly received?: unknown;
}

export interface ValidationResult {
	readonly valid: boolean;
	readonly errors: readonly ValidationError[];
}

export interface SchemaAdapter<TSchema = Schema> {
	readonly name: string;

	/**
	 * Return a TypeScript type string for the schema at pointer.
	 */
	inferTypeScript(schema: TSchema, pointer?: JSONPointer): string;

	/**
	 * Validate a value intended for pointer.
	 */
	validateValue(
		schema: TSchema,
		pointer: JSONPointer,
		value: unknown,
	): ValidationResult;

	/**
	 * Validate a patch against the schema.
	 */
	validatePatch(
		schema: TSchema,
		patch: readonly PatchOperation[],
	): ValidationResult;
}

export class SchemaValidationError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message);
		this.name = 'SchemaValidationError';
		if (options?.cause) (this as any).cause = options.cause;
	}
}
