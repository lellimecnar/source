import type { JSONPointer } from '@jsonpath/pointer';
import type { PatchOperation } from '@jsonpath/patch';
import type { SchemaAdapter, Schema, ValidationResult } from './types.js';
import { SchemaValidationError } from './types.js';

export interface SchemaValidator<TSchema = Schema> {
	readonly adapterName: string;
	validateValue(
		schema: TSchema,
		pointer: JSONPointer,
		value: unknown,
	): ValidationResult;
	validatePatch(
		schema: TSchema,
		patch: readonly PatchOperation[],
	): ValidationResult;
	inferTypeScript(schema: TSchema, pointer?: JSONPointer): string;
}

class AdapterBackedSchemaValidator<
	TSchema,
> implements SchemaValidator<TSchema> {
	readonly adapterName: string;

	constructor(private readonly adapter: SchemaAdapter<TSchema>) {
		this.adapterName = adapter.name;
	}

	validateValue(
		schema: TSchema,
		pointer: JSONPointer,
		value: unknown,
	): ValidationResult {
		try {
			return this.adapter.validateValue(schema, pointer, value);
		} catch (err) {
			throw new SchemaValidationError('Schema adapter validateValue failed', {
				cause: err,
			});
		}
	}

	validatePatch(
		schema: TSchema,
		patch: readonly PatchOperation[],
	): ValidationResult {
		try {
			return this.adapter.validatePatch(schema, patch);
		} catch (err) {
			throw new SchemaValidationError('Schema adapter validatePatch failed', {
				cause: err,
			});
		}
	}

	inferTypeScript(schema: TSchema, pointer?: JSONPointer): string {
		try {
			return this.adapter.inferTypeScript(schema, pointer);
		} catch (err) {
			throw new SchemaValidationError('Schema adapter inferTypeScript failed', {
				cause: err,
			});
		}
	}
}

export function createSchemaValidator<TSchema = Schema>(
	adapter: SchemaAdapter<TSchema>,
): SchemaValidator<TSchema> {
	return new AdapterBackedSchemaValidator(adapter);
}
