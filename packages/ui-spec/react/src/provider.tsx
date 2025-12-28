import type { UISpecStore } from '@ui-spec/core';
import * as React from 'react';

const StoreContext = React.createContext<UISpecStore | null>(null);

export function UISpecProvider(props: {
	store: UISpecStore;
	children: React.ReactNode;
}) {
	return (
		<StoreContext.Provider value={props.store}>
			{props.children}
		</StoreContext.Provider>
	);
}

export function useUISpecStore(): UISpecStore {
	const store = React.useContext(StoreContext);
	if (!store) {
		throw new Error('UISpecProvider is missing in the component tree.');
	}
	return store;
}
