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

	// Expressions
	BinaryExpr = 'BinaryExpr',
	UnaryExpr = 'UnaryExpr',
	FunctionCall = 'FunctionCall',
	Literal = 'Literal',
	SingularQuery = 'SingularQuery',
}

export interface ASTNode {
	readonly type: NodeType;
	readonly start: number;
	readonly end: number;
}

export interface QueryNode extends ASTNode {
	readonly type: NodeType.Query;
	readonly segments: SegmentNode[];
}

export interface SegmentNode extends ASTNode {
	readonly type: NodeType.ChildSegment | NodeType.DescendantSegment;
	readonly selectors: SelectorNode[];
}

export interface NameSelectorNode extends ASTNode {
	readonly type: NodeType.NameSelector;
	readonly name: string;
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
	readonly startValue: number | null;
	readonly endValue: number | null;
	readonly stepValue: number | null;
}

export interface FilterSelectorNode extends ASTNode {
	readonly type: NodeType.FilterSelector;
	readonly expression: ExpressionNode;
}

export type SelectorNode =
	| NameSelectorNode
	| IndexSelectorNode
	| WildcardSelectorNode
	| SliceSelectorNode
	| FilterSelectorNode;

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
}

export interface SingularQueryNode extends ASTNode {
	readonly type: NodeType.SingularQuery;
	readonly root: boolean; // true = $, false = @
	readonly segments: SegmentNode[];
}

export type ExpressionNode =
	| BinaryExprNode
	| UnaryExprNode
	| FunctionCallNode
	| LiteralNode
	| SingularQueryNode;
