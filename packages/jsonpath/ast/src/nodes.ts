export interface AstNodeBase<TKind extends string> {
	kind: TKind;
}

export type JsonPathAst = PathNode;

export const SelectorKinds = {
	Name: 'Selector:Name',
	Wildcard: 'Selector:Wildcard',
	Index: 'Selector:Index',
	Slice: 'Selector:Slice',
	Filter: 'Selector:Filter',
} as const;

export const FilterExprKinds = {
	Or: 'FilterExpr:Or',
	And: 'FilterExpr:And',
	Not: 'FilterExpr:Not',
	Compare: 'FilterExpr:Compare',
	Literal: 'FilterExpr:Literal',
	EmbeddedQuery: 'FilterExpr:EmbeddedQuery',
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

export type FilterSelectorNode = AstNodeBase<
	(typeof SelectorKinds)['Filter']
> & {
	expr: FilterExprNode;
};

export type FilterOrNode = AstNodeBase<(typeof FilterExprKinds)['Or']> & {
	left: FilterExprNode;
	right: FilterExprNode;
};

export type FilterAndNode = AstNodeBase<(typeof FilterExprKinds)['And']> & {
	left: FilterExprNode;
	right: FilterExprNode;
};

export type FilterNotNode = AstNodeBase<(typeof FilterExprKinds)['Not']> & {
	expr: FilterExprNode;
};

export type FilterCompareNode = AstNodeBase<
	(typeof FilterExprKinds)['Compare']
> & {
	operator: '==' | '!=' | '<' | '<=' | '>' | '>=';
	left: FilterExprNode;
	right: FilterExprNode;
};

export type FilterLiteralNode = AstNodeBase<
	(typeof FilterExprKinds)['Literal']
> & {
	value: string | number | boolean | null;
};

export type EmbeddedQueryNode = AstNodeBase<
	(typeof FilterExprKinds)['EmbeddedQuery']
> & {
	scope: 'root' | 'current';
	segments: SegmentNode[];
	singular: boolean;
};

export type FilterExprNode =
	| FilterOrNode
	| FilterAndNode
	| FilterNotNode
	| FilterCompareNode
	| FilterLiteralNode
	| EmbeddedQueryNode;

export type SelectorNode =
	| NameSelectorNode
	| WildcardSelectorNode
	| IndexSelectorNode
	| SliceSelectorNode
	| FilterSelectorNode
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

export function filterSelector(expr: FilterExprNode): FilterSelectorNode {
	return { kind: SelectorKinds.Filter, expr };
}

export function filterOr(
	left: FilterExprNode,
	right: FilterExprNode,
): FilterOrNode {
	return { kind: FilterExprKinds.Or, left, right };
}

export function filterAnd(
	left: FilterExprNode,
	right: FilterExprNode,
): FilterAndNode {
	return { kind: FilterExprKinds.And, left, right };
}

export function filterNot(expr: FilterExprNode): FilterNotNode {
	return { kind: FilterExprKinds.Not, expr };
}

export function filterCompare(
	operator: FilterCompareNode['operator'],
	left: FilterExprNode,
	right: FilterExprNode,
): FilterCompareNode {
	return { kind: FilterExprKinds.Compare, operator, left, right };
}

export function filterLiteral(
	value: FilterLiteralNode['value'],
): FilterLiteralNode {
	return { kind: FilterExprKinds.Literal, value };
}

export function embeddedQuery(
	scope: EmbeddedQueryNode['scope'],
	segments: SegmentNode[],
	singular = false,
): EmbeddedQueryNode {
	return { kind: FilterExprKinds.EmbeddedQuery, scope, segments, singular };
}
