import React, { createContext, useContext } from 'react';

const UISpecContext = createContext<unknown>(undefined);

export interface UISpecProviderProps {
	children: React.ReactNode;
	value: unknown;
}

export function UISpecProvider({ children, value }: UISpecProviderProps) {
	return (
		<UISpecContext.Provider value={value}>{children}</UISpecContext.Provider>
	);
}

export function useUISpecContext(): unknown {
	return useContext(UISpecContext);
}
