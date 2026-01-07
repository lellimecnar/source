export type FixtureScale = 'small' | 'medium' | 'large' | 'xlarge';

export interface GeneratorSeeded {
	seed: number;
}

export type WideObjectOptions = GeneratorSeeded & {
	width: number;
	depth: number;
};

export type DeepObjectOptions = GeneratorSeeded & {
	depth: number;
};

export type WideArrayOptions = GeneratorSeeded & {
	length: number;
};

export interface DatasetCatalog {
	smallObject: unknown;
	mediumObject: unknown;
	largeObject: unknown;
	deepObject: unknown;
	wideArray: unknown;
	mixed: unknown;
}
