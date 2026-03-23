export interface ParsedCsv {
	headers: string[];
	rows: string[][];
	originalText?: string;
}

export type ItemStatus = 'neutral' | 'up' | 'down';

export interface ItemState {
	status: ItemStatus;
	boosted: boolean;
}

export type ScoreList = number[];
