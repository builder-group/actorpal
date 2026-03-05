import React from 'react';

/**
 * A version of useMemo that runs cleanup when deps change or the component unmounts.
 *
 * @example
 * ```ts
 * const editor = useMemoCleanup(() => {
 *   const content = createState(initialValue);
 *   const unlisten = content.listen(() => {});
 *   return [{ content }, unlisten];
 * }, [initialValue]);
 * ```
 */
export function useMemoCleanup<T>(
	factory: () => [T, () => void],
	deps: React.DependencyList = []
): T {
	const cleanupRef = React.useRef<(() => void) | null>(null);

	const value = React.useMemo(() => {
		// Clean up previous value when deps change before creating the new one
		cleanupRef.current?.();
		const [returned, cleanup] = factory();
		cleanupRef.current = cleanup;
		return returned;
	}, deps);

	// Clean up on unmount
	// Note: Not nulled so React Strict Mode's fake unmount doesn't prevent real cleanup
	React.useEffect(() => {
		return () => cleanupRef.current?.();
	}, []);

	return value;
}
