export type PrattOperator = {
	id: string;
	precedence: number;
};

export class PrattRegistry {
	private readonly ops: PrattOperator[] = [];
	public register(op: PrattOperator): void {
		this.ops.push(op);
	}
	public all(): readonly PrattOperator[] {
		return this.ops;
	}
}
