import { Err, Ok, type TResult } from 'tuple-result';
import type { Result as SpectaResult } from '@/environment/specta/bindings';

export function toTuple<T, E>(result: SpectaResult<T, E>): TResult<T, E> {
	if (result.status === 'ok') {
		return Ok(result.data);
	}
	return Err(result.error);
}
