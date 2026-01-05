/**
 * @jsonpath/parser
 *
 * AST node types for JSONPath.
 *
 * @packageDocumentation
 */

export enum NodeType {
	// Root
	Query = 'Query',

	// Segments
	ChildSegment = 'ChildSegment',
	DescendantSegment = 'DescendantSegment',

	// Selectors
	NameSelector = 'NameSelector',
	IndexSelector = 'IndexSelector',
	WildcardSelector = 'WildcardSelector',
	SliceSelector = 'SliceSelector',
	FilterSelector = 'FilterSelector',
	ParentSelector = 'ParentSelector',
	PropertySelector = 'PropertySelector',

	// Expressions
	BinaryExpr = 'BinaryExpr',
	UnaryExpr = 'UnaryExpr',
	FunctionCall = 'FunctionCall',
	Literal = 'Literal',
}

export interface ASTNode {
	readonly type: NodeType;
	readonly startPos: number;
	readonly endPos: number;
}

export interface QueryNode extends ASTNode {
	readonly type: NodeType.Query;
	readonly root: boolean; // true = $, false = @
	/** Raw source for this query node (substring spanning startPos..endPos). */
	readonly source: string;
	readonly segments: SegmentNode[];
}

export interface SegmentNode extends ASTNode {
	readonly type: NodeType.ChildSegment | NodeType.DescendantSegment;
	readonly selectors: SelectorNode[];
}

export interface NameSelectorNode extends ASTNode {
	readonly type: NodeType.NameSelector;
	readonly name: string;
	/** True if the name was quoted (e.g., ['name']), false if shorthand (e.g., .name). */
	readonly quoted: boolean;
}

export interface IndexSelectorNode extends ASTNode {
	readonly type: NodeType.IndexSelector;
	readonly index: number;
}

export interface WildcardSelectorNode extends ASTNode {
	readonly type: NodeType.WildcardSelector;
}

export interface SliceSelectorNode extends ASTNode {
	readonly type: NodeType.SliceSelector;
	readonly start: number | null;
	readonly end: number | null;
	readonly step: number | null;
}

export interface FilterSelectorNode extends ASTNode {
	readonly type: NodeType.FilterSelector;
	readonly expression: ExpressionNode;
}

export interface ParentSelectorNode extends ASTNode {
	readonly type: NodeType.ParentSelector;
}

export interface PropertySelectorNode extends ASTNode {
	readonly type: NodeType.PropertySelector;
}

export type SelectorNode =
	| NameSelectorNode
	| IndexSelectorNode
	| WildcardSelectorNode
	| SliceSelectorNode
	| FilterSelectorNode
	| ParentSelectorNode
	| PropertySelectorNode;

export interface BinaryExprNode extends ASTNode {
	readonly type: NodeType.BinaryExpr;
	readonly operator: string;
	readonly left: ExpressionNode;
	readonly right: ExpressionNode;
}

export interface UnaryExprNode extends ASTNode {
	readonly type: NodeType.UnaryExpr;
	readonly operator: string;
	readonly operand: ExpressionNode;
}

export interface FunctionCallNode extends ASTNode {
	readonly type: NodeType.FunctionCall;
	readonly name: string;
	readonly args: ExpressionNode[];
}

export interface LiteralNode extends ASTNode {
	readonly type: NodeType.Literal;
	readonly value: string | number | boolean | null;
	/** Raw source for this literal (including quotes/escapes). */
	readonly raw: string;
}

export type ExpressionNode =
	| BinaryExprNode
	| UnaryExprNode
	| FunctionCallNode
	| LiteralNode
	| QueryNode;

/**
 * Checks if a query is singular according to RFC 9535.
 * A singular query is a query that can only produce a result set with at most one node.
 * A query is singular if it is:
 * - the absolute query $
 * - the relative query @
 * - a singular query followed by a child segment with a single name or index selector.
 */
export function isSingularQuery(query: QueryNode): boolean {
	for (const segment of query.segments) {
		if (segment.type !== NodeType.ChildSegment) return false;
		if (segment.selectors.length !== 1) return false;
		const selector = segment.selectors[0]!;
		if (
			selector.type !== NodeType.NameSelector &&
			selector.type !== NodeType.IndexSelector
		) {
			return false;
		}
	}
	return true;
}
