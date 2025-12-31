export interface AstNodeBase<TKind extends string> {
	kind: TKind;
}

export type JsonPathAst = PathNode;

export const SelectorKinds = {
	Name: 'Selector:Name',
	Wildcard: 'Selector:Wildcard',
	Index: 'Selector:Index',
	Slice: 'Selector:Slice',
} as const;

export type NameSelectorNode = AstNodeBase<(typeof SelectorKinds)['Name']> & {
	name: string;
};

export type WildcardSelectorNode = AstNodeBase<
	(typeof SelectorKinds)['Wildcard']
>;

export type IndexSelectorNode = AstNodeBase<(typeof SelectorKinds)['Index']> & {
	index: number;
};

export type SliceSelectorNode = AstNodeBase<(typeof SelectorKinds)['Slice']> & {
	start?: number;
	end?: number;
	step?: number;
};

export type SelectorNode =
	| NameSelectorNode
	| WildcardSelectorNode
	| IndexSelectorNode
	| SliceSelectorNode
	| (AstNodeBase<string> & Record<string, unknown>);

export type ChildSegmentNode = AstNodeBase<'Segment'> & {
	selectors: SelectorNode[];
};

export type DescendantSegmentNode = AstNodeBase<'DescendantSegment'> & {
	selectors: SelectorNode[];
};

export type SegmentNode = ChildSegmentNode | DescendantSegmentNode;

export type PathNode = AstNodeBase<'Path'> & {
	segments: SegmentNode[];
};

export function path(segments: SegmentNode[]): PathNode {
	return { kind: 'Path', segments };
}

export function segment(selectors: SelectorNode[]): ChildSegmentNode {
	return { kind: 'Segment', selectors };
}

export function descendantSegment(
	selectors: SelectorNode[],
): DescendantSegmentNode {
	return { kind: 'DescendantSegment', selectors };
}

export function nameSelector(name: string): NameSelectorNode {
	return { kind: SelectorKinds.Name, name };
}

export function wildcardSelector(): WildcardSelectorNode {
	return { kind: SelectorKinds.Wildcard };
}

export function indexSelector(index: number): IndexSelectorNode {
	return { kind: SelectorKinds.Index, index };
}

export function sliceSelector(args: {
	start?: number;
	end?: number;
	step?: number;
}): SliceSelectorNode {
	return {
		kind: SelectorKinds.Slice,
		start: args.start,
		end: args.end,
		step: args.step,
	};
}
