import type { Operation } from '../types';
import type { BatchContext } from './types';

export class BatchManager {
	private stack: BatchContext[] = [];

	get isBatching(): boolean {
		return this.stack.length > 0;
	}

	get depth(): number {
		return this.stack.length;
	}

	start(): void {
		this.stack.push({
			operations: [],
			affectedPointers: new Set(),
			structuralPointers: new Set(),
		});
	}

	collect(
		ops: Operation[],
		affected: Set<string>,
		structural: Set<string>,
	): void {
		const current = this.stack[this.stack.length - 1];
		if (!current) return;

		current.operations.push(...ops);
		for (const p of affected) current.affectedPointers.add(p);
		for (const p of structural) current.structuralPointers.add(p);
	}

	end(): BatchContext | undefined {
		const context = this.stack.pop();
		if (!context) return undefined;

		// If we are still batching (nested), merge current context into parent
		if (this.stack.length > 0) {
			const parent = this.stack[this.stack.length - 1];
			if (parent) {
				parent.operations.push(...context.operations);
				for (const p of context.affectedPointers)
					parent.affectedPointers.add(p);
				for (const p of context.structuralPointers)
					parent.structuralPointers.add(p);
			}
		}

		return context;
	}
}
