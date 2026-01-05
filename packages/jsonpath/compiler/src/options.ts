export interface CompilerOptions {
	/** Include a source header and preserve a readable body. */
	readonly sourceMap?: boolean;
	/** Favor smaller generated source (may reduce performance). */
	readonly optimizeForSmall?: boolean;
	/** Skip some runtime checks (use only in trusted inputs). */
	readonly unsafe?: boolean;
	/** Enable caching of compiled queries. */
	readonly useCache?: boolean;
	/** Cache size for compiled queries. */
	readonly cacheSize?: number;
}

export const defaultCompilerOptions = {
	sourceMap: false,
	optimizeForSmall: false,
	unsafe: false,
	useCache: true,
	cacheSize: 100,
} as const satisfies Required<CompilerOptions>;
