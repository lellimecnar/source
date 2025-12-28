export interface UIScriptAllowlist {
	globals?: Record<string, unknown>;
}

export interface UIScriptOptions {
	enabled?: boolean;
	allowlist?: UIScriptAllowlist;
	timeoutMs?: number;
}

export const defaultUIScriptOptions: Required<UIScriptOptions> = {
	enabled: false,
	allowlist: { globals: {} },
	timeoutMs: 250,
};
