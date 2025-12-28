import * as React from 'react';

export function AsyncBoundary<T>(props: {
	promise: Promise<T>;
	fallback?: React.ReactNode;
	children: (value: T) => React.ReactNode;
}) {
	const [state, setState] = React.useState<{
		status: 'pending' | 'fulfilled' | 'rejected';
		value?: T;
		error?: unknown;
	}>({
		status: 'pending',
	});

	React.useEffect(() => {
		let cancelled = false;
		setState({ status: 'pending' });
		props.promise
			.then((value) => {
				if (cancelled) return;
				setState({ status: 'fulfilled', value });
			})
			.catch((error) => {
				if (cancelled) return;
				setState({ status: 'rejected', error });
			});
		return () => {
			cancelled = true;
		};
	}, [props.promise]);

	if (state.status === 'pending') return <>{props.fallback ?? null}</>;
	if (state.status === 'rejected')
		return <>{String((state.error as any)?.message ?? state.error)}</>;
	return <>{props.children(state.value as T)}</>;
}
