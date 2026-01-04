/**
 * @jsonpath/patch
 *
 * Fluent API for building JSON Patches (RFC 6902).
 *
 * @packageDocumentation
 */

import type { PatchOperation } from './patch.js';
import { applyPatch } from './patch.js';

export class PatchBuilder {
	private operations: PatchOperation[] = [];

	add(path: string, value: any): this {
		this.operations.push({ op: 'add', path, value });
		return this;
	}

	remove(path: string): this {
		this.operations.push({ op: 'remove', path });
		return this;
	}

	replace(path: string, value: any): this {
		this.operations.push({ op: 'replace', path, value });
		return this;
	}

	move(from: string, path: string): this {
		this.operations.push({ op: 'move', from, path });
		return this;
	}

	copy(from: string, path: string): this {
		this.operations.push({ op: 'copy', from, path });
		return this;
	}

	test(path: string, value: any): this {
		this.operations.push({ op: 'test', path, value });
		return this;
	}

	toOperations(): PatchOperation[] {
		return [...this.operations];
	}

	build(): PatchOperation[] {
		return this.toOperations();
	}

	apply(target: any, options?: Parameters<typeof applyPatch>[2]): any {
		return applyPatch(target, this.operations, options);
	}
}

export function builder(): PatchBuilder {
	return new PatchBuilder();
}
