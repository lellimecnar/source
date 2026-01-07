import type { DataMap } from '../datamap';
import type { Batch } from './fluent';
import { buildSetPatch } from '../patch/builder';
import type { CallOptions, Operation } from '../types';
import { cloneSnapshot } from '../utils/clone';

export class FluentBatchBuilder<T, Ctx> implements Batch<DataMap<T, Ctx>> {
	private ops: Operation[] = [];
	private workingData: unknown;

	constructor(private dm: DataMap<T, Ctx>) {
		this.workingData = dm.getSnapshot();
	}

	set(pathOrPointer: string, value: unknown, options?: CallOptions): this {
		const ops = (this.dm as any).set.toPatch(pathOrPointer, value, options);
		this.ops.push(...ops);
		// Apply ops to workingData for subsequent steps
		for (const op of ops) {
			if (op.op === 'replace') {
				const parts = op.path.split('/').filter(Boolean);
				let current = this.workingData as any;
				for (let i = 0; i < parts.length - 1; i++) {
					current = current[parts[i]];
				}
				if (current !== undefined) {
					current[parts[parts.length - 1]] = op.value;
				}
			} else if (op.op === 'add') {
				const parts = op.path.split('/').filter(Boolean);
				let current = this.workingData as any;
				for (let i = 0; i < parts.length - 1; i++) {
					if (!current[parts[i]]) {
						current[parts[i]] = {};
					}
					current = current[parts[i]];
				}
				if (current !== undefined) {
					current[parts[parts.length - 1]] = op.value;
				}
			}
		}
		return this;
	}

	remove(pathOrPointer: string, options?: CallOptions): this {
		const ops = (this.dm as any).remove.toPatch(pathOrPointer, options);
		this.ops.push(...ops);
		// Apply ops to workingData for subsequent steps
		for (const op of ops) {
			if (op.op === 'remove') {
				const parts = op.path.split('/').filter(Boolean);
				let current = this.workingData as any;
				for (let i = 0; i < parts.length - 1; i++) {
					current = current[parts[i]];
				}
				if (current !== undefined) {
					delete current[parts[parts.length - 1]];
				}
			}
		}
		return this;
	}

	merge(pathOrPointer: string, value: object, options?: CallOptions): this {
		const ops = (this.dm as any).merge.toPatch(pathOrPointer, value, options);
		this.ops.push(...ops);
		return this;
	}

	move(from: string, to: string, options?: CallOptions): this {
		const ops = (this.dm as any).move.toPatch(from, to, options);
		this.ops.push(...ops);
		return this;
	}

	copy(from: string, to: string, options?: CallOptions): this {
		const ops = (this.dm as any).copy.toPatch(from, to, options);
		this.ops.push(...ops);
		return this;
	}

	apply(): DataMap<T, Ctx> {
		this.dm.batch((d: DataMap<T, Ctx>) => {
			d.patch(this.ops);
		});
		return this.dm;
	}

	toPatch(): Operation[] {
		return cloneSnapshot(this.ops);
	}
}
