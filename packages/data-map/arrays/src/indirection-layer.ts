import type { IndirectionState } from './types.js';

export class IndirectionLayer {
	private state: IndirectionState;
	private nextPhysicalCounter: number;

	constructor(initialLength = 0) {
		this.state = {
			logicalToPhysical: Array.from({ length: initialLength }, (_, i) => i),
			freeSlots: [],
		};
		this.nextPhysicalCounter = initialLength;
	}

	get length(): number {
		return this.state.logicalToPhysical.length;
	}

	getPhysical(logicalIndex: number): number {
		const idx = this.state.logicalToPhysical[logicalIndex];
		if (typeof idx === 'undefined') {
			throw new Error(`Invalid logical index: ${logicalIndex}`);
		}
		return idx;
	}

	pushPhysical(): number {
		const reused = this.state.freeSlots.pop();
		const physical =
			typeof reused === 'number' ? reused : this.nextPhysicalCounter++;
		this.state.logicalToPhysical.push(physical);
		return physical;
	}

	insertAt(logicalIndex: number): number {
		const reused = this.state.freeSlots.pop();
		const physical =
			typeof reused === 'number' ? reused : this.nextPhysicalCounter++;
		this.state.logicalToPhysical.splice(logicalIndex, 0, physical);
		return physical;
	}

	removeAt(logicalIndex: number): number {
		const removed = this.state.logicalToPhysical.splice(logicalIndex, 1);
		const physical = removed[0];
		if (physical !== undefined) {
			this.state.freeSlots.push(physical);
		}
		if (physical === undefined) {
			throw new Error(`No physical index at logical index ${logicalIndex}`);
		}
		return physical;
	}
}
