import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appConfig, replicate, replicateConfig } from '../.server/environment';
import { createGridMetadata } from '../features/expression-grid/.server';

describe('playground', () => {
	it('should have environment variables loaded', () => {
		expect(appConfig.env).toBeDefined();
		expect(appConfig.env).toBe('test');
		expect(replicateConfig.apiToken).toBeDefined();

		console.log('✓ Environment variables loaded successfully');
	});

	it('should generate single image', async () => {
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

	it('should generate grid of images looking toward center', async () => {
		const gridSize = 2;
		const folderName = 'girl-1';

		const __dirname = dirname(fileURLToPath(import.meta.url));
		const resourcesDir = join(__dirname, 'resources/.local', folderName);
		const outputDir = join(resourcesDir, 'v1');
		const inputImagePath = join(resourcesDir, 'input.png');

		await mkdir(outputDir, { recursive: true });

		const imageBuffer = await readFile(inputImagePath);

		type TMetadata = {
			filename: string;
			x: number;
			y: number;
			url: string;
		};

		const metadata = (
			await createGridMetadata<TMetadata>({
				image: imageBuffer,
				gridSize,
				middleware: async (item): Promise<TMetadata> => {
					const filename = `grid_${gridSize}x${gridSize}_x${item.x}y${item.y}.webp`;
					const filepath = join(outputDir, filename);

					// @ts-expect-error - FileOutput extends ReadableStream and writeFile accepts it
					await writeFile(filepath, item.image);
					console.log(`✓ Saved ${filename}`);

					return {
						filename,
						x: item.x,
						y: item.y,
						url: item.image.url().toString()
					};
				}
			})
		).unwrap();

		const metadataPath = join(outputDir, 'metadata.json');
		await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
		console.log(`✓ Saved metadata.json`);

		console.log(`✓ Generated ${gridSize * gridSize} images in ${gridSize}x${gridSize} grid`);
	});
});
