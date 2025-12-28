import type { RouteSchema, UISpecSchema } from '@ui-spec/core';

import { fetchSchema } from './lazy';
import { matchPath } from './match';

export interface RouterState {
	pathname: string;
	params: Record<string, string>;
	active?: RouteSchema;
	loadedSchema?: UISpecSchema;
}

export function createRouter(schema: UISpecSchema) {
	let state: RouterState = {
		pathname: '/',
		params: {},
		active: undefined,
		loadedSchema: undefined,
	};
	const listeners = new Set<() => void>();

	const routes = schema.routes ?? [];

	const notify = () => {
		for (const l of Array.from(listeners)) l();
	};

	const compute = async (pathname: string) => {
		for (const route of routes) {
			const match = matchPath(route.path, pathname);
			if (!match) continue;
			state = { ...state, pathname, params: match.params, active: route };
			if (route.load?.url) {
				const loadedSchema = await fetchSchema(route.load.url);
				state = { ...state, loadedSchema };
			} else {
				state = { ...state, loadedSchema: undefined };
			}
			notify();
			return;
		}
		state = {
			...state,
			pathname,
			params: {},
			active: undefined,
			loadedSchema: undefined,
		};
		notify();
	};

	const onPop = () => {
		void compute(getPathname());
	};

	const getPathname = () => {
		if (typeof window === 'undefined') return state.pathname;
		return window.location.pathname;
	};

	const start = () => {
		if (typeof window !== 'undefined')
			window.addEventListener('popstate', onPop);
		void compute(getPathname());
	};

	const stop = () => {
		if (typeof window !== 'undefined')
			window.removeEventListener('popstate', onPop);
	};

	const navigate = (to: string) => {
		if (typeof window !== 'undefined') {
			window.history.pushState(null, '', to);
			void compute(getPathname());
		} else {
			state = { ...state, pathname: to };
			notify();
		}
	};

	return {
		start,
		stop,
		navigate,
		getState: () => state,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export * from './match';
export * from './lazy';
