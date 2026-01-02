import type { PathNode, SegmentNode, SelectorNode } from './nodes';

export type Visitor = {
	Path?: (node: PathNode) => void;
	Segment?: (node: SegmentNode) => void;
	Selector?: (node: SelectorNode) => void;
};

export function visitPath(node: PathNode, visitor: Visitor): void {
	visitor.Path?.(node);
	for (const seg of node.segments) {
		visitor.Segment?.(seg);
		for (const sel of seg.selectors) visitor.Selector?.(sel);
	}
}
