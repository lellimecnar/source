/**
 * @jsonpath/patch
 *
 * Fluent API for building JSON Patches (RFC 6902).
 *
 * @packageDocumentation
 */

import { JSONPointer } from '@jsonpath/pointer';

import { replaceAll, removeAll } from './jsonpath-ops.js';
import type { PatchOperation } from './patch.js';
import { applyPatch } from './patch.js';

export class PatchBuilder {
	private operations: PatchOperation[] = [];
	private nextCondition: boolean | null = null;

	constructor(private target?: any) {}

	/**
	 * Only applies the next operation if the condition is true.
	 */
	when(condition: boolean): this {
		this.nextCondition = condition;
		return this;
	}

	/**
	 * Only applies the next operation if the path exists in the target.
	 * Requires the builder to be initialized with a target.
	 */
	ifExists(path: string): this {
		if (!this.target) {
			throw new Error('ifExists() requires a target document');
		}
		this.nextCondition = new JSONPointer(path).exists(this.target);
		return this;
	}

	private shouldAdd(): boolean {
		if (this.nextCondition === null) return true;
		const res = this.nextCondition;
		this.nextCondition = null;
		return res;
	}

	add(path: string, value: any): this {
		if (this.shouldAdd()) {
			this.operations.push({ op: 'add', path, value });
		}
		return this;
	}

	remove(path: string): this {
		if (this.shouldAdd()) {
			this.operations.push({ op: 'remove', path });
		}
		return this;
	}

	replace(path: string, value: any): this {
		if (this.shouldAdd()) {
			this.operations.push({ op: 'replace', path, value });
		}
		return this;
	}

	move(from: string, path: string): this {
		if (this.shouldAdd()) {
			this.operations.push({ op: 'move', from, path });
		}
		return this;
	}

	copy(from: string, path: string): this {
		if (this.shouldAdd()) {
			this.operations.push({ op: 'copy', from, path });
		}
		return this;
	}

	test(path: string, value: any): this {
		if (this.shouldAdd()) {
			this.operations.push({ op: 'test', path, value });
		}
		return this;
	}

	/**
	 * Finds all paths matching the JSONPath and adds a replace operation for each.
	 * Requires the builder to be initialized with a target.
	 */
	replaceAll(jsonpath: string, value: any): this {
		if (!this.target) {
			throw new Error('replaceAll() requires a target document');
		}
		this.operations.push(...replaceAll(this.target, jsonpath, value));
		return this;
	}

	/**
	 * Finds all paths matching the JSONPath and adds a remove operation for each.
	 * Requires the builder to be initialized with a target.
	 */
	removeAll(jsonpath: string): this {
		if (!this.target) {
			throw new Error('removeAll() requires a target document');
		}
		this.operations.push(...removeAll(this.target, jsonpath));
		return this;
	}

	toOperations(): PatchOperation[] {
		return [...this.operations];
	}

	build(): PatchOperation[] {
		return this.toOperations();
	}

	apply(target?: any, options?: Parameters<typeof applyPatch>[2]): any {
		return applyPatch(target ?? this.target, this.operations, options);
	}
}

export function builder(target?: any): PatchBuilder {
	return new PatchBuilder(target);
}
