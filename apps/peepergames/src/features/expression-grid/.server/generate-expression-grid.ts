import { Err, Ok, type TResult } from 'tuple-result';
import {
	generateExpressionGridItems,
	type TExpressionGridItem
} from './generate-expression-grid-items';

export async function generateExpressionGrid<T>(
	config: TGenerateExpressionGridConfig<T>
): Promise<TResult<T[][], string>> {
	const { image, gridSize, middleware } = config;

	const [areItemsOk, itemsErr, items] = await generateExpressionGridItems({ image, gridSize });
	if (!areItemsOk) {
		return Err(itemsErr);
	}

	// Initialize 2D array
	const metadata: T[][] = [];
	for (let y = 0; y < gridSize; y++) {
		metadata[y] = [];
	}

	// Process each item through middleware
	for (const item of items) {
		const result = await middleware(item);
		if (metadata[item.y] != null) {
			// @ts-expect-error - we check above that the item is in the grid
			metadata[item.y][item.x] = result;
		}
	}

	return Ok(metadata);
}

export interface TGenerateExpressionGridConfig<T> {
	image: string | Buffer;
	gridSize: number;
	middleware: TExpressionGridMiddleware<T>;
}

export type TExpressionGridMiddleware<T> = (item: TExpressionGridItem) => Promise<T> | T;
