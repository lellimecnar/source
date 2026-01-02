import type { ParserContext } from './context';
import type { PathNode } from '@jsonpath/ast';
import { path } from '@jsonpath/ast';

export type SegmentParser = (ctx: ParserContext) => PathNode | null;

export class JsonPathParser {
	private readonly segmentParsers: SegmentParser[] = [];
	public registerSegmentParser(p: SegmentParser): void {
		this.segmentParsers.push(p);
	}
	public parse(ctx: ParserContext): PathNode {
		// Framework-only placeholder: returns empty path when no parsers installed.
		for (const p of this.segmentParsers) {
			const result = p(ctx);
			if (result) return result;
		}
		return path([]);
	}
}
