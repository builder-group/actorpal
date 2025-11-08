import { Err, Ok, type TResult } from 'tuple-result';
import { generateExpressionGrid, type TExpressionGridItem } from './generate-expression-grid';

export async function createGridMetadata<T extends Record<string, unknown>>(
	config: TCreateGridMetadataConfig<T>
): Promise<TResult<T[][], string>> {
	const { image, gridSize, middleware } = config;

	const [areItemsOk, itemsErr, items] = await generateExpressionGrid({ image, gridSize });
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

export interface TCreateGridMetadataConfig<T> {
	image: string | Buffer;
	gridSize: number;
	middleware: TMetadataMiddleware<T>;
}

export type TMetadataMiddleware<T> = (item: TExpressionGridItem) => Promise<T> | T;
