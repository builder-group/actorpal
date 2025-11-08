import { writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { appConfig, replicate, replicateConfig } from '../.server/environment';

describe('playground', () => {
	it('should have environment variables loaded', () => {
		expect(appConfig.env).toBeDefined();
		expect(appConfig.env).toBe('test');
		expect(replicateConfig.apiToken).toBeDefined();

		console.log('✓ Environment variables loaded successfully');
	});

	it('should generate image', async () => {
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
});
