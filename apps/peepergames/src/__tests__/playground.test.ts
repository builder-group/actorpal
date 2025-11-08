import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appConfig, replicate, replicateConfig } from '../.server/environment';
import { generateExpressionGrid } from '../features/expression-grid/.server';

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
		const imageUrl =
			'https://replicate.delivery/pbxt/Lg7pzAsHjoZlGHtrfI4wnVZchV8G9XCyXXMG37YMyb4NoBiU/PhotoMaker_00001_.png';

		const __dirname = dirname(fileURLToPath(import.meta.url));
		const outputDir = join(__dirname, 'resources/.local/girl-1/v1');
		await mkdir(outputDir, { recursive: true });

		const items = (
			await generateExpressionGrid({
				imageUrl,
				gridSize
			})
		).unwrap();

		for (const item of items) {
			const filename = `grid_${gridSize}x${gridSize}_x${item.x}y${item.y}.webp`;
			const filepath = join(outputDir, filename);
			await writeFile(filepath, item.image as any);
			console.log(`✓ Saved ${filename}`);
		}

		console.log(`✓ Generated ${items.length} images in ${gridSize}x${gridSize} grid`);
	});
});
