import * as React from 'react';

export function useLifecycle(options: {
	onMounted?: () => void;
	onUpdated?: () => void;
	onUnmounted?: () => void;
}) {
	const mountedRef = React.useRef(false);

	React.useEffect(() => {
		mountedRef.current = true;
		options.onMounted?.();
		return () => {
			options.onUnmounted?.();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	React.useEffect(() => {
		if (!mountedRef.current) return;
		options.onUpdated?.();
	});
}
