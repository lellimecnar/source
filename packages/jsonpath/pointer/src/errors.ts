import { JSONPointerError } from '@jsonpath/core';

export class PointerSyntaxError extends JSONPointerError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, options);
		this.name = 'PointerSyntaxError';
	}
}

export class PointerResolutionError extends JSONPointerError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, options);
		this.name = 'PointerResolutionError';
	}
}
