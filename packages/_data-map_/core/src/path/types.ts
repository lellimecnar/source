import type { PathSegment } from './segments';

export type SerializedSegment =
	| { type: 'static'; value: string }
	| { type: 'index'; value: number }
	| { type: 'wildcard' }
	| { type: 'slice'; start?: number; end?: number; step: number }
	| { type: 'filter'; expression: string; hash: string }
	| { type: 'recursive'; following: SerializedSegment[] };

export interface SerializedPattern {
	source: string;
	segments: SerializedSegment[];
	isSingular: boolean;
	concretePrefix: string;
}

// Helper to keep serialization aligned with in-memory segments.
export function serializeSegment(seg: PathSegment): SerializedSegment {
	switch (seg.type) {
		case 'static':
			return { type: 'static', value: seg.value };
		case 'index':
			return { type: 'index', value: seg.value };
		case 'wildcard':
			return { type: 'wildcard' };
		case 'slice':
			return {
				type: 'slice',
				start: seg.start,
				end: seg.end,
				step: seg.step,
			};
		case 'filter':
			return { type: 'filter', expression: seg.expression, hash: seg.hash };
		case 'recursive':
			return {
				type: 'recursive',
				following: seg.following.map(serializeSegment),
			};
		default:
			return seg as never;
	}
}
