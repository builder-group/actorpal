import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appConfig, replicate, replicateConfig } from '../.server/environment';
import { createExpressionAtlas } from '../features/gaze-expression/.server';

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

	it('should generate expression atlas (separate sprite files) looking toward center', async () => {
		const gridSize = 3;
		const folderName = 'girl-1';

		const __dirname = dirname(fileURLToPath(import.meta.url));
		const resourcesDir = join(__dirname, 'resources/.local', folderName);
		const outputDir = join(resourcesDir, 'v1');
		const inputImagePath = join(resourcesDir, 'input.png');

		await mkdir(outputDir, { recursive: true });

		const imageBuffer = await readFile(inputImagePath);

		// Generate expression atlas: collection of separate sprite files organized by gaze direction
		const atlas = (
			await createExpressionAtlas<{
				filename: string;
				url: string;
			}>({
				image: imageBuffer,
				gridSize,
				middleware: async (item) => {
					const filename = `grid_${gridSize}x${gridSize}_x${item.x}y${item.y}.webp`;
					const filepath = join(outputDir, filename);

					// @ts-expect-error - FileOutput extends ReadableStream and writeFile accepts it
					await writeFile(filepath, item.image);
					console.log(`✓ Saved ${filename}`);

					return {
						filename,
						url: item.image.url().toString()
					};
				}
			})
		).unwrap();

		const metadataPath = join(outputDir, 'metadata.json');
		await writeFile(metadataPath, JSON.stringify(atlas, null, 2));
		console.log(`✓ Saved metadata.json`);

		console.log(`✓ Generated ${gridSize * gridSize} sprites in ${gridSize}x${gridSize} atlas`);
	});
});
