import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appConfig, replicate, replicateConfig } from '../.server/environment';
import { getImageDimensions, readableStreamToBuffer } from '../.server/lib';
import { createSpriteMap, createSpriteSheet } from '../features/gaze-expression/.server';

describe('playground', () => {
	it('should have environment variables loaded', () => {
		expect(appConfig.env).toBeDefined();
		expect(appConfig.env).toBe('test');
		expect(replicateConfig.apiToken).toBeDefined();

		console.log('✓ Environment variables loaded successfully');
	});

	it('should generate gaze expression image', async () => {
		const input = {
			image:
				'https://replicate.delivery/pbxt/Lg7pzAsHjoZlGHtrfI4wnVZchV8G9XCyXXMG37YMyb4NoBiU/PhotoMaker_00001_.png',
			pupil_x: 13.46,
			rotate_pitch: 10.54
		};

		const output = await replicate.run(replicateConfig.models['expression-editor'].id, { input });

		for (const [index, item] of Object.entries(output)) {
			await writeFile(`output_${index}.webp`, item);
		}
	});

	it('should generate expression sprite map (separate sprite files) looking toward center', async () => {
		const mapSize = 10;
		const folderName = 'girl-1';

		const __dirname = dirname(fileURLToPath(import.meta.url));
		const resourcesDir = join(__dirname, 'resources/.local', folderName);
		const outputDir = join(resourcesDir, 'v3.1');
		const inputImagePath = join(resourcesDir, 'input.png');

		await mkdir(outputDir, { recursive: true });

		const imageBuffer = await readFile(inputImagePath);

		// Step 1: Generate sprite map
		const spriteSize = 512;
		const spriteMap = (
			await createSpriteMap<{
				filename: string;
				spriteUrl: string;
				buffer: Buffer;
				width: number;
				height: number;
				spriteSheetX: number;
				spriteSheetY: number;
			}>({
				image: imageBuffer,
				mapSize,
				middleware: async (item) => {
					const buffer = (await readableStreamToBuffer(item.image)).unwrap();
					const dimensions = (await getImageDimensions(buffer)).unwrap();

					return {
						filename: `sprite_${mapSize}x${mapSize}_x${item.x}y${item.y}.webp`,
						spriteUrl: item.image.url().toString(),
						buffer,
						width: dimensions.width,
						height: dimensions.height,
						spriteSheetX: item.x * spriteSize,
						spriteSheetY: item.y * spriteSize
					};
				}
			})
		).unwrap();

		// Step 2: Write individual sprite files
		for (let y = 0; y < mapSize; y++) {
			for (let x = 0; x < mapSize; x++) {
				const item = spriteMap[y]?.[x];
				if (item == null) continue;

				const filepath = join(outputDir, item.filename);
				await writeFile(filepath, item.buffer);
				console.log(`✓ Saved ${item.filename}`);
			}
		}

		// Step 3: Create sprite sheet from buffers
		const spriteBuffers: (Buffer | null)[][] = [];
		for (let y = 0; y < mapSize; y++) {
			const row: (Buffer | null)[] = [];
			for (let x = 0; x < mapSize; x++) {
				const item = spriteMap[y]?.[x];
				row[x] = item?.buffer ?? null;
			}
			spriteBuffers[y] = row;
		}
		const spriteSheetBuffer = (
			await createSpriteSheet({
				spriteBuffers,
				mapSize,
				spriteSize
			})
		).unwrap();

		const spriteSheetPath = join(outputDir, `sprite-sheet_${mapSize}x${mapSize}.webp`);
		await writeFile(spriteSheetPath, spriteSheetBuffer);
		console.log(`✓ Created sprite sheet: ${spriteSheetPath}`);

		// Step 4: Save sprite map metadata (without buffers for JSON)
		const spriteMapMetadata = spriteMap.map((row) =>
			row.map((item) => ({
				filename: item.filename,
				spriteUrl: item.spriteUrl,
				width: item.width,
				height: item.height,
				spriteSheetX: item.spriteSheetX,
				spriteSheetY: item.spriteSheetY
			}))
		);
		const spriteMapPath = join(outputDir, 'sprite-map.json');
		await writeFile(spriteMapPath, JSON.stringify(spriteMapMetadata, null, 2));
		console.log(`✓ Saved sprite-map.json`);

		console.log(`✓ Generated ${mapSize * mapSize} sprites in ${mapSize}x${mapSize} sprite map`);
	});
});
