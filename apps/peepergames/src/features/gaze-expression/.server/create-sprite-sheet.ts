import sharp from 'sharp';
import { Err, Ok, type TResult } from 'tuple-result';

export async function createSpriteSheet(
	config: TCreateSpriteSheetConfig
): Promise<TResult<Buffer, string>> {
	const { spriteBuffers, mapSize, spriteSize = 512 } = config;

	if (spriteBuffers.length !== mapSize) {
		return Err(`Invalid spriteBuffers: expected ${mapSize} rows, got ${spriteBuffers.length}`);
	}

	const sheetWidth = mapSize * spriteSize;
	const sheetHeight = mapSize * spriteSize;

	// Create a blank canvas for the sprite sheet
	const spriteSheet = sharp({
		create: {
			width: sheetWidth,
			height: sheetHeight,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		}
	});

	// Composite all sprites onto the sheet
	const composites: sharp.OverlayOptions[] = [];
	for (let y = 0; y < mapSize; y++) {
		const row = spriteBuffers[y];
		if (row == null || row.length !== mapSize) {
			return Err(
				`Invalid spriteBuffers row ${y}: expected ${mapSize} columns, got ${row?.length ?? 0}`
			);
		}

		for (let x = 0; x < mapSize; x++) {
			const spriteBuffer = row[x];
			if (spriteBuffer == null) {
				continue;
			}

			composites.push({
				input: spriteBuffer,
				left: x * spriteSize,
				top: y * spriteSize
			});
		}
	}

	// Composite all sprites onto the sheet and return as buffer
	let spriteSheetBuffer: Buffer;
	try {
		spriteSheetBuffer = await spriteSheet.composite(composites).webp({ quality: 95 }).toBuffer();
	} catch (error) {
		return Err(
			`Failed to create sprite sheet: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	return Ok(spriteSheetBuffer);
}

export interface TCreateSpriteSheetConfig {
	spriteBuffers: (Buffer | null)[][];
	mapSize: number;
	spriteSize?: number; // Default 512
}
