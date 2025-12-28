import * as React from 'react';

export interface LifecycleHandlers {
	onMounted?: () => void;
	onUpdated?: () => void;
	onUnmounted?: () => void;
}

export function useLifecycle(handlers: LifecycleHandlers) {
	const isFirst = React.useRef(true);

	React.useEffect(() => {
		handlers.onMounted?.();
		return () => {
			handlers.onUnmounted?.();
		};
	}, []);

	React.useEffect(() => {
		if (isFirst.current) {
			isFirst.current = false;
			return;
		}
		handlers.onUpdated?.();
	});
}
