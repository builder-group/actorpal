import { Err, Ok, type TResult } from 'tuple-result';
import { generateExpressionSprites, type TExpressionSprite } from './generate-expression-sprites';

export async function createExpressionAtlas<T>(
	config: TCreateExpressionAtlasConfig<T>
): Promise<TResult<T[][], string>> {
	const { image, gridSize, middleware } = config;

	const [areItemsOk, itemsErr, items] = await generateExpressionSprites({ image, gridSize });
	if (!areItemsOk) {
		return Err(itemsErr);
	}

	// Initialize 2D array
	const atlas: T[][] = [];
	for (let y = 0; y < gridSize; y++) {
		atlas[y] = [];
	}

	// Process each sprite through middleware to build atlas
	for (const item of items) {
		const result = await middleware(item);
		if (atlas[item.y] != null) {
			// @ts-expect-error - we check above that the item is in the grid
			atlas[item.y][item.x] = result;
		}
	}

	return Ok(atlas);
}

export interface TCreateExpressionAtlasConfig<T> {
	image: string | Buffer;
	gridSize: number;
	middleware: TExpressionAtlasMiddleware<T>;
}

export type TExpressionAtlasMiddleware<T> = (item: TExpressionSprite) => Promise<T> | T;
