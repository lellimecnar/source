export type JsonPatchOp =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'remove'; path: string };
