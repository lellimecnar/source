export type AstNodeBase<TKind extends string> = {
	kind: TKind;
};

export type JsonPathAst = PathNode;

export type PathNode = AstNodeBase<'Path'> & {
	segments: SegmentNode[];
};

export type SegmentNode = AstNodeBase<'Segment'> & {
	selectors: SelectorNode[];
};

export type SelectorNode = AstNodeBase<string> & Record<string, unknown>;

export function path(segments: SegmentNode[]): PathNode {
	return { kind: 'Path', segments };
}

export function segment(selectors: SelectorNode[]): SegmentNode {
	return { kind: 'Segment', selectors };
}
