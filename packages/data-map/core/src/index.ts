export type {
	CallOptions,
	DataMapOptions,
	PathType,
	ResolvedMatch,
} from './types';

export { detectPathType } from './path/detect';

export {
	buildPointer,
	escapePointerSegment,
	parsePointerSegments,
	unescapePointerSegment,
} from './utils/pointer';

export { DataMap } from './datamap';
