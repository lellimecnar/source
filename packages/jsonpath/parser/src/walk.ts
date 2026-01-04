/**
 * @jsonpath/parser
 *
 * AST traversal utilities.
 *
 * @packageDocumentation
 */

import {
	NodeType,
	type ASTNode,
	type QueryNode,
	type SegmentNode,
	type SelectorNode,
	type ExpressionNode,
	type SingularQueryNode,
	type BinaryExprNode,
	type UnaryExprNode,
	type FunctionCallNode,
} from './nodes.js';

export type Visitor = {
	[K in NodeType]?: (node: any, parent: ASTNode | null) => void;
};

export function walk(node: ASTNode, visitor: Visitor, parent: ASTNode | null = null): void {
	const visit = visitor[node.type];
	if (visit) {
		visit(node, parent);
	}

	switch (node.type) {
		case NodeType.Query:
			(node as QueryNode).segments.forEach((s) => walk(s, visitor, node));
			break;
		case NodeType.ChildSegment:
		case NodeType.DescendantSegment:
			(node as SegmentNode).selectors.forEach((s) => walk(s, visitor, node));
			break;
		case NodeType.FilterSelector:
			walk((node as any).expression, visitor, node);
			break;
		case NodeType.BinaryExpr:
			walk((node as BinaryExprNode).left, visitor, node);
			walk((node as BinaryExprNode).right, visitor, node);
			break;
		case NodeType.UnaryExpr:
			walk((node as UnaryExprNode).operand, visitor, node);
			break;
		case NodeType.FunctionCall:
			(node as FunctionCallNode).args.forEach((a) => walk(a, visitor, node));
			break;
		case NodeType.SingularQuery:
			(node as SingularQueryNode).segments.forEach((s) => walk(s, visitor, node));
			break;
	}
}
