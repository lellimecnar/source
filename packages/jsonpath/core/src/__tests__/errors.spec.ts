import { describe, it, expect } from 'vitest';
import {
	JSONPathError,
	JSONPathSyntaxError,
	JSONPathTypeError,
	JSONPathReferenceError,
	JSONPointerError,
	JSONPatchError,
} from '../errors.js';

describe('errors', () => {
	it('should create a base JSONPathError', () => {
		const error = new JSONPathError('test message', 'SYNTAX_ERROR', {
			position: 10,
			path: '$.a',
		});

		expect(error.message).toBe('test message');
		expect(error.code).toBe('SYNTAX_ERROR');
		expect(error.position).toBe(10);
		expect(error.path).toBe('$.a');
		expect(error.name).toBe('JSONPathError');
	});

	it('should create specific error types', () => {
		const syntaxError = new JSONPathSyntaxError('syntax error', {
			position: 5,
		});
		expect(syntaxError instanceof JSONPathError).toBe(true);
		expect(syntaxError.name).toBe('JSONPathSyntaxError');
		expect(syntaxError.code).toBe('SYNTAX_ERROR');
		expect(syntaxError.position).toBe(5);

		const typeError = new JSONPathTypeError('type error', { path: '$.b' });
		expect(typeError.name).toBe('JSONPathTypeError');
		expect(typeError.code).toBe('TYPE_ERROR');
		expect(typeError.path).toBe('$.b');

		const refError = new JSONPathReferenceError('ref error');
		expect(refError.name).toBe('JSONPathReferenceError');
		expect(refError.code).toBe('REFERENCE_ERROR');

		const pointerError = new JSONPointerError('pointer error');
		expect(pointerError.name).toBe('JSONPointerError');
		expect(pointerError.code).toBe('POINTER_ERROR');

		const patchError = new JSONPatchError('patch error');
		expect(patchError.name).toBe('JSONPatchError');
		expect(patchError.code).toBe('PATCH_ERROR');
	});

	it('should serialize to JSON', () => {
		const error = new JSONPathError('test', 'SYNTAX_ERROR', { position: 1 });
		const json = error.toJSON();

		expect(json.message).toBe('test');
		expect(json.code).toBe('SYNTAX_ERROR');
		expect(json.position).toBe(1);
	});
});
