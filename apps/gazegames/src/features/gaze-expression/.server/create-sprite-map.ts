import { Err, Ok, type TResult } from 'tuple-result';
import { generateExpressionSprites, type TExpressionSprite } from './generate-expression-sprites';

export async function createSpriteMap<T>(
	config: TCreateSpriteMapConfig<T>
): Promise<TResult<T[][], string>> {
	const { image, mapSize, middleware } = config;

	const [areItemsOk, itemsErr, items] = await generateExpressionSprites({
		image,
		mapSize
	});
	if (!areItemsOk) {
		return Err(itemsErr);
	}

	// Initialize 2D sprite map: maps positions (x,y) to sprite metadata (URLs, filenames, etc.)
	const spriteMap: T[][] = [];
	for (let y = 0; y < mapSize; y++) {
		spriteMap[y] = [];
	}

	// Process each sprite through middleware to build the sprite map
	for (const item of items) {
		const result = await middleware(item);
		if (spriteMap[item.y] != null) {
			// @ts-expect-error - we check above that the item is within bounds
			spriteMap[item.y][item.x] = result;
		}
	}

	return Ok(spriteMap);
}

export interface TCreateSpriteMapConfig<T> {
	image: string | Buffer;
	mapSize: number;
	middleware: TSpriteMapMiddleware<T>;
}

export type TSpriteMapMiddleware<T> = (item: TExpressionSprite) => Promise<T> | T;
