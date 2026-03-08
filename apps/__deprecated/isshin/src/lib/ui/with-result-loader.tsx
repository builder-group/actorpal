import React from 'react';
import { useLoaderData } from 'react-router';
import { match, TResult } from 'tuple-result';
import { TLoaderFunction } from '@/types';

/**
 * A HOC that handles direct loader results with success and error states.
 * Works with loaders that return TResult directly (SPA mode - no serialization needed).
 *
 * @example
 * ```tsx
 * export const clientLoader = async () => {
 *   const data = await fetchData();
 *   return Ok(data);
 * };
 *
 * export default withResultLoader<TSuccessData, TErrorData>({
 *   Success: ({ data }) => <div>{data.whatever}</div>,
 *   Error: ({ error }) => <div>{error.message}</div>
 * });
 * ```
 */
export function withResultLoader<GSuccess, GError>(
	config: TWithResultLoaderConfig<GSuccess, GError>
): React.FC {
	const { Success, Error } = config;

	return () => {
		const loaderData = useLoaderData<TResult<GSuccess, GError>>();

		return match(loaderData, {
			ok: (data) => <Success data={data} />,
			err: (error) => (Error != null ? <Error error={error} /> : null)
		});
	};
}

export interface TWithResultLoaderConfig<GSuccess, GError> {
	Success: React.ComponentType<{ data: GSuccess }>;
	Error?: React.ComponentType<{ error: GError }>;
}

export function resultLoader<GSuccess, GError>(
	loaderFn: TLoaderFunction<TResult<GSuccess, GError>>
): TLoaderFunction<TResult<GSuccess, GError>> {
	return loaderFn;
}
